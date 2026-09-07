import express from 'express'
import pg from 'pg'

const app = express()
const { Pool } = pg
const port = Number(process.env.PORT || 3000)
const service = process.env.SERVICE_NAME || 'commerce-service'
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

app.use(express.json())
app.get('/health', (_req, res) => res.json({ service, status: 'ok' }))
app.get('/ready', async (_req, res) => {
  try { await pool.query('SELECT 1'); res.json({ service, status: 'ready' }) }
  catch { res.status(503).json({ service, status: 'not-ready' }) }
})
app.get('/api/products', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM products ORDER BY id')
    res.json(rows)
  } catch (e) { res.status(500).json({ error: e.message }) }
})
app.get('/api/stats', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT COUNT(*)::int AS products FROM products')
    res.json({ service, products: rows[0].products })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.listen(port, () => console.log(`${service} listening on ${port}`))
