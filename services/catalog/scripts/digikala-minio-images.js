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
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
const headers = {
  'User-Agent': 'NovaMarket-Lab-CatalogImporter/1.0 (local infrastructure lab)',
  'Accept': 'application/json',
  'Accept-Language': 'fa-IR,fa;q=0.9,en;q=0.8'
}

function required(name) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing environment variable: ${name}`)
  return value
}

async function getJson(url) {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(30000) })
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`)
  return response.json()
}

function productFromResponse(json) {
  return json?.data?.product || json?.data || json?.product || json
}

function productsFromSearch(json) {
  const data = json?.data || {}
  return data.products || data?.widget?.data?.products || []
}

function imageList(product) {
  const images = product?.images
  const result = []
  const add = value => {
    if (typeof value === 'string' && /^https:\/\//i.test(value)) result.push(value)
    else if (value && typeof value === 'object') {
      const url = value.url || value.src || value.webp_url || value.webp
      if (typeof url === 'string' && /^https:\/\//i.test(url)) result.push(url)
    }
  }
  if (Array.isArray(images)) images.forEach(add)
  else if (images && typeof images === 'object') {
    add(images.main)
    add(images.image)
    add(images.list)
    add(images
    .main_image)
    for (const [key, value] of Object.entries(images)) {
      if (/main|image|img|photo|gallery/i.test(key)) {
        if (Array.isArray(value)) value.forEach(add)
        else add(value)
      }
    }
  }
  if (result.length === 0) {
    const main = product?.image || product?.image_url || product?.thumbnail
    add(main)
  }
  return [...new Set(result)]
}

function normalizeCandidate(product) {
  const id = product?.id || product?.product_id
  const title = product?.title_fa || product?.title || product?.name
  const images = imageList(product)
  if (!id || !title || images.length === 0) return null
  const rawUrl = product?.url || product?.web_url
  return {
    digikalaProductId: String(id),
    title: String(title),
    productUrl: rawUrl
      ? (String(rawUrl).startsWith('http') ? rawUrl : `https://www.digikala.com${rawUrl}`)
      : `https://www.digikala.com/product/dkp-${id}/`,
    previewImage: images[0]
  }
}

async function discover(items) {
  const results = []
  for (const item of items) {
    const url = `https://api.digikala.com/v1/search/?q=${encodeURIComponent(item.query)}`
    try {
      const json = await getJson(url)
      const candidates = productsFromSearch(json).map(normalizeCandidate).filter(Boolean).slice(0, 8)
      results.push({ ...item, candidates })
      console.log(`${item.slug}: ${candidates.length} candidate(s)`)
    } catch (error) {
      results.push({ ...item, candidates: [], error: error.message })
      console.error(`${item.slug}: ${error.message}`)
    }
    await delay(1200)
  }
  const file = path.join(root, 'assets/digikala-image-candidates.json')
  await fs.writeFile(file, JSON.stringify(results, null, 2) + '\n')
  console.log(`Candidate list written to ${file}`)
  console.log('Review each candidate and set digikalaProductId in digikala-product-images.json. No images or database records changed.')
}

async function getSelectedProduct(productId) {
  const json = await getJson(`https://api.digikala.com/v2/product/${encodeURIComponent(productId)}/`)
  const product = productFromResponse(json)
  const images = imageList(product)
  if (!images.length) throw new Error(`No product images found for Digikala ID ${productId}`)
  return { product, images }
}

async function download(items) {
  await fs.mkdir(outputDir, { recursive: true })
  const selected = items.filter(item => item.digikalaProductId)
  if (!selected.length) throw new Error('No digikalaProductId selected. Review digikala-image-candidates.json and fill the manifest first.')
  const report = []
  for (const item of selected) {
    const { product, images } = await getSelectedProduct(item.digikalaProductId)
    const response = await fetch(images[0], { headers, signal: AbortSignal.timeout(30000) })
    if (!response.ok) throw new Error(`Image download failed for ${item.slug}: HTTP ${response.status}`)
    const contentType = response.headers.get('content-type') || ''
    if (!contentType.startsWith('image/')) throw new Error(`Non-image response for ${item.slug}: ${contentType}`)
    const bytes = Buffer.from(await response.arrayBuffer())
    if (bytes.length < 5000) throw new Error(`Image too small for ${item.slug}: ${bytes.length} bytes`)
    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg'
    const file = path.join(outputDir, `${item.slug}.${ext}`)
    await fs.writeFile(file, bytes)
    report.push({
      slug: item.slug,
      digikalaProductId: String(item.digikalaProductId),
      productTitle: product.title_fa || product.title || item.query,
      productUrl: `https://www.digikala.com/product/dkp-${item.digikalaProductId}/`,
      imageUrl: images[0],
      galleryImageCount: images.length,
      file: path.relative(root, file),
      contentType,
      size: bytes.length
    })
    console.log(`Downloaded ${item.slug} (${bytes.length} bytes)`)
    await delay(700)
  }
  const reportPath = path.join(root, 'assets/digikala-image-download-report.json')
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2) + '\n')
  console.log(`Downloaded ${report.length} images. Review the files and report. MinIO and PostgreSQL were not changed.`)
}

async function importImages(items) {
  const selected = items.filter(item => item.digikalaProductId)
  if (!selected.length || selected.length !== items.length) {
    throw new Error('Every manifest entry must have a reviewed digikalaProductId before import.')
  }
  const files = []
  for (const item of selected) {
    const names = (await fs.readdir(outputDir)).filter(name => name.startsWith(`${item.slug}.`))
    if (names.length !== 1) throw new Error(`Expected one downloaded image for ${item.slug}; found ${names.length}`)
    const file = path.join(outputDir, names[0])
    files.push({ ...item, file, bytes: await fs.readFile(file) })
  }
  if (!apply) {
    console.log(`DRY RUN: ${files.length} files validated. No MinIO or DB changes. Use --apply only after reviewing the images.`)
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
    if (!await minio.bucketExists(bucket)) throw new Error(`MinIO bucket "${bucket}" does not exist`)
    const { rows } = await pool.query('SELECT id, slug FROM products WHERE slug = ANY($1::text[])', [selected.map(x => x.slug)])
    const ids = new Map(rows.map(row => [row.slug, row.id]))
    const missing = selected.filter(x => !ids.has(x.slug)).map(x => x.slug)
    if (missing.length) throw new Error(`Products missing in DB; no uploads performed: ${missing.join(', ')}`)

    const uploaded = []
    for (const item of files) {
      const id = ids.get(item.slug)
      const ext = path.extname(item.file).slice(1)
      const key = `products/${id}/main.${ext}`
      const contentType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'
      await minio.putObject(bucket, key, item.bytes, item.bytes.length, {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400'
      })
      uploaded.push({ id, slug: item.slug, key })
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
    console.log(`Imported ${uploaded.length} product images into ${bucket} and updated DB references.`)
  } finally {
    await pool.end()
  }
}

const items = JSON.parse(await fs.readFile(manifestPath, 'utf8'))
if (mode === 'discover') await discover(items)
else if (mode === 'download') await download(items)
else if (mode === 'import') await importImages(items)
else throw new Error('Usage: node scripts/digikala-minio-images.js [discover|download|import] [--apply]')
