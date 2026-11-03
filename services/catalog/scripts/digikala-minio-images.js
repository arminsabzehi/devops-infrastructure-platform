import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import { Client as MinioClient } from 'minio'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const manifestPath = path.join(root, 'assets/digikala-product-images.json')
const outputDir = process.env.IMAGE_ASSET_DIR || path.join(root, 'assets/product-images-digikala')
const mode = process.argv[2] || 'discover'
const apply = process.argv.includes('--apply')
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const headers = {
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'fa-IR,fa;q=0.9,en;q=0.8'
}

function required(name) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing environment variable: ${name}`)
  return value
}

async function getJson(url) {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(25000) })
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`)
  return response.json()
}

function walk(value, visit, depth = 0) {
  if (!value || typeof value !== 'object' || depth > 12) return
  if (Array.isArray(value)) return value.forEach(item => walk(item, visit, depth + 1))
  visit(value)
  for (const child of Object.values(value)) walk(child, visit, depth + 1)
}

function imageUrls(product) {
  const found = []
  walk(product, obj => {
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value !== 'string' || !/^https?:\/\//i.test(value)) continue
      if (/image|img|picture|photo|thumbnail|main/i.test(key) ||
          /dkstatics-public\.digikala\.com|digikala-products/i.test(value)) {
        if (/\.(jpe?g|png|webp)(\?|$)/i.test(value) ||
            /dkstatics-public\.digikala\.com|digikala-products/i.test(value)) found.push(value)
      }
    }
  })
  return [...new Set(found)]
}

function productCandidates(json) {
  const candidates = []
  walk(json, obj => {
    const id = obj.id ?? obj.product_id
    const title = obj.title_fa ?? obj.title ?? obj.name
    if (id && title && imageUrls(obj).length) {
      candidates.push({
        id: String(id),
        title: String(title),
        url: obj.url ? (String(obj.url).startsWith('http') ? obj.url : `https://www.digikala.com${obj.url}`) : null,
        image: imageUrls(obj)[0]
      })
    }
  })
  const seen = new Set()
  return candidates.filter(item => !seen.has(item.id) && seen.add(item.id)).slice(0, 8)
}

async function discover(items) {
  const results = []
  for (const item of items) {
    const url = `https://api.digikala.com/v1/search/?q=${encodeURIComponent(item.query)}`
    try {
      const json = await getJson(url)
      const candidates = productCandidates(json)
      results.push({ ...item, candidates })
      console.log(`${item.slug}: ${candidates.length} candidate(s)`)
    } catch (error) {
      results.push({ ...item, candidates: [], error: error.message })
      console.error(`${item.slug}: ${error.message}`)
    }
    await sleep(900)
  }
  const file = path.join(root, 'assets/digikala-image-candidates.json')
  await fs.writeFile(file, JSON.stringify(results, null, 2) + '\n')
  console.log(`Saved review file: ${file}`)
  console.log('Review candidates and copy the chosen product ID into digikala-product-images.json before running download.')
}

async function getProductImage(productId) {
  const json = await getJson(`https://api.digikala.com/v2/product/${encodeURIComponent(productId)}/`)
  const candidates = productCandidates(json)
  const urls = imageUrls(json)
  const main = urls[0] || candidates[0]?.image
  if (!main) throw new Error(`No image URL found for Digikala product ${productId}`)
  return main
}

async function download(items) {
  await fs.mkdir(outputDir, { recursive: true })
  const selected = items.filter(item => item.digikalaProductId)
  if (!selected.length) throw new Error('No digikalaProductId selected. Run discover, review candidates, then fill the manifest.')
  const prepared = []
  for (const item of selected) {
    const imageUrl = await getProductImage(item.digikalaProductId)
    const response = await fetch(imageUrl, { headers, signal: AbortSignal.timeout(30000) })
    if (!response.ok) throw new Error(`Image download failed for ${item.slug}: HTTP ${response.status}`)
    const type = response.headers.get('content-type') || ''
    if (!type.startsWith('image/')) throw new Error(`Non-image response for ${item.slug}: ${type}`)
    const bytes = Buffer.from(await response.arrayBuffer())
    if (bytes.length < 5000) throw new Error(`Image too small for ${item.slug}: ${bytes.length} bytes`)
    const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg'
    const file = path.join(outputDir, `${item.slug}.${ext}`)
    await fs.writeFile(file, bytes)
    prepared.push({ ...item, imageUrl, file, contentType: type, size: bytes.length })
    console.log(`Downloaded ${item.slug}: ${bytes.length} bytes`)
    await sleep(500)
  }
  const report = path.join(root, 'assets/digikala-image-download-report.json')
  await fs.writeFile(report, JSON.stringify(prepared.map(({ file, ...item }) => ({ ...item, file: path.relative(root, file) })), null, 2) + '\n')
  console.log(`Downloaded ${prepared.length} images. Review files in ${outputDir}; nothing uploaded and database untouched.`)
}

async function importImages(items) {
  const selected = items.filter(item => item.digikalaProductId)
  if (selected.length !== items.length) throw new Error('Every manifest entry must have a reviewed digikalaProductId before import.')
  const files = []
  for (const item of selected) {
    const matches = (await fs.readdir(outputDir)).filter(name => name.startsWith(`${item.slug}.`))
    if (matches.length !== 1) throw new Error(`Expected exactly one downloaded image for ${item.slug}; found ${matches.length}`)
    const file = path.join(outputDir, matches[0])
    files.push({ ...item, file, bytes: await fs.readFile(file) })
  }

  if (!apply) {
    console.log(`DRY RUN: ${files.length} images ready. No MinIO or PostgreSQL changes. Re-run with --apply to upload and update DB.`)
    return
  }

  const endpoint = required('S3_ENDPOINT')
  const [endPoint, portText] = endpoint.split(':')
  const useSSL = String(process.env.S3_USE_SSL || 'false') === 'true'
  const minio = new MinioClient({
    endPoint, port: Number(portText || (useSSL ? 443 : 80)), useSSL,
    accessKey: required('S3_ACCESS_KEY'), secretKey: required('S3_SECRET_KEY')
  })
  const bucket = required('S3_BUCKET')
  const pool = new pg.Pool({ connectionString: required('DATABASE_URL') })
  try {
    if (!await minio.bucketExists(bucket)) throw new Error(`Bucket "${bucket}" does not exist`)
    const { rows } = await pool.query('SELECT id, slug FROM products WHERE slug = ANY($1::text[])', [selected.map(x => x.slug)])
    const ids = new Map(rows.map(row => [row.slug, row.id]))
    const missing = selected.filter(x => !ids.has(x.slug)).map(x => x.slug)
    if (missing.length) throw new Error(`Products missing in DB; nothing uploaded: ${missing.join(', ')}`)

    const uploaded = []
    for (const item of files) {
      const id = ids.get(item.slug)
      const ext = path.extname(item.file).slice(1)
      const key = `products/${id}/main.${ext}`
      const type = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'
      await minio.putObject(bucket, key, item.bytes, item.bytes.length, { 'Content-Type': type, 'Cache-Control': 'public, max-age=86400' })
      uploaded.push({ id, slug: item.slug, key })
      console.log(`Uploaded ${item.slug} -> ${key}`)
    }

    const db = await pool.connect()
    try {
      await db.query('BEGIN')
      for (const item of uploaded) {
        await db.query('UPDATE products SET image=$1 WHERE id=$2', [item.key, item.id])
        const result = await db.query('UPDATE product_images SET url=$1 WHERE product_id=$2', [item.key, item.id])
        if (result.rowCount === 0) {
          await db.query('INSERT INTO product_images(product_id,url,sort_order) VALUES($1,$2,0)', [item.id, item.key])
        }
      }
      await db.query('COMMIT')
    } catch (error) {
      await db.query('ROLLBACK')
      throw error
    } finally {
      db.release()
    }
    console.log(`Updated ${uploaded.length} products in bucket ${bucket}.`)
  } finally {
    await pool.end()
  }
}

const items = JSON.parse(await fs.readFile(manifestPath, 'utf8'))
if (mode === 'discover') await discover(items)
else if (mode === 'download') await download(items)
else if (mode === 'import') await importImages(items)
else throw new Error('Usage: node scripts/digikala-minio-images.js [discover|download|import] [--apply]')
