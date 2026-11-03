import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import { Client as MinioClient } from 'minio'

const here = path.dirname(fileURLToPath(import.meta.url))
const manifest = JSON.parse(await fs.readFile(path.join(here, '../assets/product-image-sources.json'), 'utf8'))
const assetDir = process.env.IMAGE_ASSET_DIR || path.join(here, '../assets/product-images')
const downloadOnly = process.argv.includes('--download-only')
const products = Object.entries(manifest)

function required(name) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing environment variable: ${name}`)
  return value
}

function sourceUrl(photoId) {
  return `https://images.pexels.com/photos/${photoId}/pexels-photo-${photoId}.jpeg?auto=compress&cs=tinysrgb&w=1200`
}

await fs.mkdir(assetDir, { recursive: true })

// Download and validate every source before touching MinIO or PostgreSQL.
const photoCache = new Map()
const prepared = []
for (const [slug, photoId] of products) {
  let bytes = photoCache.get(photoId)
  if (!bytes) {
    const file = path.join(assetDir, `${photoId}.jpg`)
    try {
      bytes = await fs.readFile(file)
    } catch {
      const response = await fetch(sourceUrl(photoId), { redirect: 'follow' })
      if (!response.ok) throw new Error(`Download failed for Pexels photo ${photoId}: HTTP ${response.status}`)
      const type = response.headers.get('content-type') || ''
      if (!type.startsWith('image/')) throw new Error(`Pexels photo ${photoId} returned non-image content: ${type}`)
      bytes = Buffer.from(await response.arrayBuffer())
      if (bytes.length < 10_000) throw new Error(`Pexels photo ${photoId} is unexpectedly small (${bytes.length} bytes)`)
      await fs.writeFile(file, bytes)
    }
    photoCache.set(photoId, bytes)
  }
  prepared.push({ slug, photoId, bytes })
}

console.log(`Prepared ${prepared.length} products using ${photoCache.size} distinct Pexels photos.`)
if (downloadOnly) {
  console.log(`Images downloaded to ${assetDir}. No MinIO or database changes were made.`)
  process.exit(0)
}

const endpoint = required('S3_ENDPOINT')
const [endPoint, portText] = endpoint.split(':')
const useSSL = String(process.env.S3_USE_SSL || 'false') === 'true'
const bucket = required('S3_BUCKET')
const minio = new MinioClient({
  endPoint,
  port: Number(portText || (useSSL ? 443 : 80)),
  useSSL,
  accessKey: required('S3_ACCESS_KEY'),
  secretKey: required('S3_SECRET_KEY')
})
const pool = new pg.Pool({ connectionString: required('DATABASE_URL') })

try {
  if (!await minio.bucketExists(bucket)) throw new Error(`MinIO bucket "${bucket}" does not exist; create/verify it first.`)

  const { rows } = await pool.query(
    'SELECT id, slug FROM products WHERE slug = ANY($1::text[])',
    [products.map(([slug]) => slug)]
  )
  const found = new Set(rows.map(row => row.slug))
  const missing = products.map(([slug]) => slug).filter(slug => !found.has(slug))
  if (missing.length) throw new Error(`Products missing from database; nothing uploaded: ${missing.join(', ')}`)

  const ids = new Map(rows.map(row => [row.slug, row.id]))
  const uploaded = []
  for (const item of prepared) {
    const productId = ids.get(item.slug)
    const objectKey = `products/${productId}/main.jpg`
    await minio.putObject(bucket, objectKey, item.bytes, item.bytes.length, {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=86400'
    })
    uploaded.push({ productId, objectKey })
    console.log(`Uploaded ${item.slug} -> ${objectKey}`)
  }

  const db = await pool.connect()
  try {
    await db.query('BEGIN')
    for (const item of uploaded) {
      await db.query('UPDATE products SET image=$1 WHERE id=$2', [item.objectKey, item.productId])
      const result = await db.query(
        'UPDATE product_images SET url=$1 WHERE product_id=$2',
        [item.objectKey, item.productId]
      )
      if (result.rowCount === 0) {
        await db.query(
          'INSERT INTO product_images(product_id,url,sort_order) VALUES($1,$2,0)',
          [item.productId, item.objectKey]
        )
      }
    }
    await db.query('COMMIT')
  } catch (error) {
    await db.query('ROLLBACK')
    throw error
  } finally {
    db.release()
  }

  console.log(`Success: ${uploaded.length} product images stored in MinIO bucket "${bucket}" and database references updated.`)
} finally {
  await pool.end()
}
