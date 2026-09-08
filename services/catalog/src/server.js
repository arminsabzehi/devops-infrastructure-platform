import express from 'express'
import pg from 'pg'
import { Client } from 'minio'

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

const s3Client = s3Endpoint && s3Bucket && s3AccessKey && s3SecretKey
  ? new Client({
      endPoint: s3Endpoint.split(':')[0],
      port: Number(s3Endpoint.split(':')[1] || (s3UseSsl ? 443 : 80)),
      useSSL: s3UseSsl,
      accessKey: s3AccessKey,
      secretKey: s3SecretKey
    })
  : null

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

app.listen(port,()=>console.log(`catalog listening on ${port}`))
