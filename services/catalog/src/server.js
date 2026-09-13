import express from 'express'
import pg from 'pg'
import { Client } from 'minio'
import multer from 'multer'
import crypto from 'crypto'

const app = express()
const { Pool } = pg
const port = Number(process.env.PORT || 3000)
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const s3Endpoint = process.env.S3_ENDPOINT || ''
const s3UseSsl = String(process.env.S3_USE_SSL || 'false') === 'true'
const s3Bucket = process.env.S3_BUCKET || ''
const s3PublicBaseUrl = process.env.S3_PUBLIC_BASE_URL || ''
const s3AccessKey = process.env.S3_ACCESS_KEY || ''
const s3SecretKey = process.env.S3_SECRET_KEY || ''
const s3PresignExpiry = Math.max(Number(process.env.S3_PRESIGN_EXPIRY || 3600), 60)
const adminToken = process.env.ADMIN_TOKEN || ''

const s3Client = s3Endpoint && s3Bucket && s3AccessKey && s3SecretKey
  ? new Client({
      endPoint: s3Endpoint.split(':')[0],
      port: Number(s3Endpoint.split(':')[1] || (s3UseSsl ? 443 : 80)),
      useSSL: s3UseSsl,
      accessKey: s3AccessKey,
      secretKey: s3SecretKey
    })
  : null

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) return cb(new Error('only jpeg, png, webp and gif images are allowed'))
    cb(null, true)
  }
})

async function resolveImageUrl(value) {
  if (!value) return value
  if (/^https?:\/\//i.test(value)) return value
  if (!s3Endpoint || !s3Bucket) return value
  if (s3Client) {
    try {
      return await s3Client.presignedGetObject(s3Bucket, value.replace(/^\//, ''), s3PresignExpiry)
    } catch (e) {
      console.error(`failed to presign object ${value}: ${e.message}`)
    }
  }
  if (s3PublicBaseUrl) return `${s3PublicBaseUrl.replace(/\/$/, '')}/${value.replace(/^\//, '')}`
  const protocol = s3UseSsl ? 'https' : 'http'
  return `${protocol}://${s3Endpoint}/${s3Bucket}/${value.replace(/^\//, '')}`
}

async function mapProduct(row) {
  if (!row) return row
  return {...row, image: await resolveImageUrl(row.image)}
}

async function mapProducts(rows) {
  return Promise.all(rows.map(mapProduct))
}

async function mapImages(rows) {
  return Promise.all(rows.map(async row => ({...row, url: await resolveImageUrl(row.url)})))
}

function requireAdmin(req, res, next) {
  if (!adminToken) return res.status(503).json({ error: 'admin API is not configured' })
  const supplied = req.get('x-admin-token') || ''
  if (!crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(adminToken))) return res.status(401).json({ error: 'unauthorized' })
  next()
}

async function storeImage(productId, file, sortOrder = 0) {
  if (!s3Client) throw new Error('S3/MinIO is not configured')
  const ext = ({'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'})[file.mimetype]
  const objectKey = `products/${productId}/${sortOrder === 0 ? 'main' : `image-${sortOrder}`}-${crypto.randomUUID()}.${ext}`
  await s3Client.putObject(s3Bucket, objectKey, file.buffer, file.size, { 'Content-Type': file.mimetype })
  return objectKey
}

app.use(express.json())

app.get('/health', (_req,res)=>res.json({service:'catalog',status:'ok'}))
app.get('/ready', async (_req,res)=>{ try { await pool.query('SELECT 1'); res.json({service:'catalog',status:'ready'}) } catch { res.status(503).json({service:'catalog',status:'not-ready'}) } })

app.get('/api/categories', async (_req,res)=>{
  try { const {rows}=await pool.query(`SELECT c.id,c.name,c.slug,c.parent_id,COUNT(p.id)::int product_count FROM categories c LEFT JOIN products p ON p.category=c.name WHERE c.is_active=true GROUP BY c.id ORDER BY c.id`); res.json(rows) }
  catch(e){res.status(500).json({error:e.message})}
})
app.get('/api/brands', async (_req,res)=>{
  try { const {rows}=await pool.query(`SELECT b.id,b.name,b.slug,COUNT(DISTINCT p.id)::int product_count FROM brands b LEFT JOIN products p ON lower(p.name) LIKE lower('%'||b.name||'%') WHERE b.is_active=true GROUP BY b.id ORDER BY b.name`); res.json(rows) }
  catch(e){res.status(500).json({error:e.message})}
})
app.get('/api/products', async (req,res)=>{
  try {
    const {q,category,brand,min_price,max_price,sort='newest',page='1',limit='24'}=req.query
    const values=[]; const where=[]
    if(q){values.push(`%${q}%`); where.push(`(p.name ILIKE $${values.length} OR p.description ILIKE $${values.length})`)}
    if(category){values.push(category); where.push(`p.category=$${values.length}`)}
    if(min_price){values.push(Number(min_price)); where.push(`p.price >= $${values.length}`)}
    if(max_price){values.push(Number(max_price)); where.push(`p.price <= $${values.length}`)}
    if(brand){values.push(`%${brand}%`); where.push(`p.name ILIKE $${values.length}`)}
    const order={price_asc:'p.price ASC',price_desc:'p.price DESC',rating:'p.rating DESC',popular:'p.review_count DESC',newest:'p.created_at DESC'}[sort]||'p.created_at DESC'
    const lim=Math.min(Math.max(Number(limit)||24,1),100), pgno=Math.max(Number(page)||1,1), offset=(pgno-1)*lim
    const filter=where.length?'WHERE '+where.join(' AND '):''
    const dataValues=[...values,lim,offset]
    const sql=`SELECT p.*,COALESCE(json_agg(DISTINCT jsonb_build_object('id',v.id,'sku',v.sku,'title',v.title,'attributes',v.attributes)) FILTER (WHERE v.id IS NOT NULL),'[]') variants FROM products p LEFT JOIN product_variants v ON v.product_id=p.id ${filter} GROUP BY p.id ORDER BY ${order} LIMIT $${dataValues.length-1} OFFSET $${dataValues.length}`
    const countSql=`SELECT COUNT(*)::int AS total FROM products p ${filter}`
    const [{rows},countResult]=await Promise.all([pool.query(sql,dataValues),pool.query(countSql,values)])
    res.json({page:pgno,limit:lim,total:countResult.rows[0].total,items:await mapProducts(rows)})
  } catch(e){res.status(500).json({error:e.message})}
})

app.get('/api/products/:id', async (req,res)=>{
  try {
    const p=await pool.query(`SELECT p.*,COALESCE(json_agg(DISTINCT jsonb_build_object('id',v.id,'sku',v.sku,'title',v.title,'attributes',v.attributes)) FILTER (WHERE v.id IS NOT NULL),'[]') variants FROM products p LEFT JOIN product_variants v ON v.product_id=p.id WHERE p.id=$1 GROUP BY p.id`,[req.params.id])
    if(!p.rows[0]) return res.status(404).json({error:'product not found'})
    const [offers, specs, images, reviews, questions]=await Promise.all([
      pool.query(`SELECT o.id,o.price,o.old_price,o.stock,o.shipping_days,o.is_buy_box,s.id seller_id,s.name seller_name,s.slug seller_slug,s.rating seller_rating,s.rating_count seller_rating_count FROM seller_offers o JOIN sellers s ON s.id=o.seller_id JOIN product_variants v ON v.id=o.variant_id WHERE v.product_id=$1 AND o.is_active=true ORDER BY o.is_buy_box DESC,o.price ASC`,[req.params.id]),
      pool.query(`SELECT spec_group,spec_key,spec_value FROM product_specifications WHERE product_id=$1 ORDER BY id`,[req.params.id]),
      pool.query(`SELECT id,url,sort_order FROM product_images WHERE product_id=$1 ORDER BY sort_order,id`,[req.params.id]),
      pool.query(`SELECT id,user_name,rating,title,body,pros,cons,verified,helpful_count,created_at FROM product_reviews WHERE product_id=$1 ORDER BY helpful_count DESC,created_at DESC`,[req.params.id]),
      pool.query(`SELECT id,user_name,question,answer,answered_at,created_at FROM product_questions WHERE product_id=$1 ORDER BY created_at DESC`,[req.params.id])
    ])
    res.json({...await mapProduct(p.rows[0]),offers:offers.rows,specifications:specs.rows,images:await mapImages(images.rows),reviews:reviews.rows,questions:questions.rows})
  } catch(e){res.status(500).json({error:e.message})}
})
app.get('/api/products/:id/reviews', async(req,res)=>{try{const {rows}=await pool.query(`SELECT id,user_name,rating,title,body,pros,cons,verified,helpful_count,created_at FROM product_reviews WHERE product_id=$1 ORDER BY helpful_count DESC,created_at DESC`,[req.params.id]);res.json(rows)}catch(e){res.status(500).json({error:e.message})}})
app.get('/api/products/:id/questions', async(req,res)=>{try{const {rows}=await pool.query(`SELECT id,user_name,question,answer,answered_at,created_at FROM product_questions WHERE product_id=$1 ORDER BY created_at DESC`,[req.params.id]);res.json(rows)}catch(e){res.status(500).json({error:e.message})}})
app.get('/api/products/:id/offers', async(req,res)=>{try {const {rows}=await pool.query(`SELECT o.*,s.name seller_name,s.slug seller_slug,s.rating seller_rating FROM seller_offers o JOIN sellers s ON s.id=o.seller_id JOIN product_variants v ON v.id=o.variant_id WHERE v.product_id=$1 AND o.is_active=true ORDER BY o.is_buy_box DESC,o.price ASC`,[req.params.id]);res.json(rows)}catch(e){res.status(500).json({error:e.message})}})
app.get('/api/products/:id/variants', async(req,res)=>{try {const {rows}=await pool.query(`SELECT id,sku,title,attributes,is_active FROM product_variants WHERE product_id=$1 ORDER BY id`,[req.params.id]);res.json(rows)}catch(e){res.status(500).json({error:e.message})}})
app.get('/api/search', async(req,res)=>{try {const q=String(req.query.q||'').trim(); if(!q)return res.json({query:'',items:[]}); const {rows}=await pool.query(`SELECT id,name,slug,category,price,old_price,image,rating,review_count FROM products WHERE name ILIKE $1 OR description ILIKE $1 ORDER BY review_count DESC LIMIT 50`,[`%${q}%`]);res.json({query:q,count:rows.length,items:await mapProducts(rows)})}catch(e){res.status(500).json({error:e.message})}})

// Admin product management. Content changes live in PostgreSQL/MinIO and do not require an image rebuild.
app.get('/api/admin/products', requireAdmin, async (_req,res)=>{
  try { const {rows}=await pool.query(`SELECT id,name,slug,category,price,old_price,image,badge,stock,rating,review_count,description,created_at FROM products ORDER BY id DESC`); res.json(await mapProducts(rows)) }
  catch(e){res.status(500).json({error:e.message})}
})

app.put('/api/admin/products/:id', requireAdmin, async (req,res)=>{
  try {
    const {name,slug,category,price,old_price,image,badge,stock,description}=req.body
    if(!name || !slug || !category || price === undefined) return res.status(400).json({error:'name, slug, category and price are required'})
    const {rows}=await pool.query(`UPDATE products SET name=$1,slug=$2,category=$3,price=$4,old_price=$5,image=COALESCE($6,image),badge=$7,stock=$8,description=$9 WHERE id=$10 RETURNING *`,[name,slug,category,Number(price),old_price === null || old_price === '' ? null : Number(old_price),image || null,badge || '',Number(stock || 0),description || '',req.params.id])
    if(!rows[0]) return res.status(404).json({error:'product not found'})
    res.json(await mapProduct(rows[0]))
  } catch(e){res.status(500).json({error:e.message})}
})

app.post('/api/admin/products/:id/image', requireAdmin, upload.single('image'), async (req,res)=>{
  try {
    if(!req.file) return res.status(400).json({error:'image file is required'})
    const productId=Number(req.params.id)
    if(!Number.isInteger(productId)) return res.status(400).json({error:'invalid product id'})
    const exists=await pool.query('SELECT id FROM products WHERE id=$1',[productId])
    if(!exists.rows[0]) return res.status(404).json({error:'product not found'})
    const old=await pool.query('SELECT url FROM product_images WHERE product_id=$1 AND sort_order=0 ORDER BY id LIMIT 1',[productId])
    const objectKey=await storeImage(productId,req.file,0)
    await pool.query('BEGIN')
    try {
      await pool.query('UPDATE products SET image=$1 WHERE id=$2',[objectKey,productId])
      if(old.rows[0]) await pool.query('UPDATE product_images SET url=$1 WHERE product_id=$2 AND sort_order=0',[objectKey,productId])
      else await pool.query('INSERT INTO product_images(product_id,url,sort_order) VALUES($1,$2,0)',[productId,objectKey])
      await pool.query('COMMIT')
    } catch(e) { await pool.query('ROLLBACK'); throw e }
    res.json({product_id:productId,image:await resolveImageUrl(objectKey),object_key:objectKey})
  } catch(e){res.status(500).json({error:e.message})}
})

app.delete('/api/admin/products/:id/image', requireAdmin, async (req,res)=>{
  try {
    const productId=Number(req.params.id)
    const old=await pool.query('SELECT url FROM product_images WHERE product_id=$1 AND sort_order=0 ORDER BY id LIMIT 1',[productId])
    await pool.query('UPDATE products SET image=\'\' WHERE id=$1',[productId])
    await pool.query('DELETE FROM product_images WHERE product_id=$1 AND sort_order=0',[productId])
    if(old.rows[0] && s3Client && !/^https?:\/\//i.test(old.rows[0].url)) {
      try { await s3Client.removeObject(s3Bucket,old.rows[0].url.replace(/^\//,'')) } catch(e) { console.error(`failed to remove old image: ${e.message}`) }
    }
    res.json({ok:true})
  } catch(e){res.status(500).json({error:e.message})}
})

app.use((err,_req,res,_next)=>res.status(400).json({error:err.message || 'request failed'}))
app.listen(port,()=>console.log(`catalog listening on ${port}`))
