import express from 'express'
import pg from 'pg'
import crypto from 'node:crypto'

const app = express()
const { Pool } = pg
const port = Number(process.env.PORT || 3000)
const service = process.env.SERVICE_NAME || 'commerce-service'
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

app.use(express.json())

const schemaSql = `
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS carts (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS cart_items (
  id BIGSERIAL PRIMARY KEY,
  cart_id BIGINT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  UNIQUE(cart_id, product_id)
);
CREATE TABLE IF NOT EXISTS orders (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending',
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(14,2) NOT NULL
);
CREATE TABLE IF NOT EXISTS addresses (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT NOT NULL,
  postal_code TEXT
);
CREATE INDEX IF NOT EXISTS sessions_token_hash_idx ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS cart_items_cart_idx ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items(order_id);
`

const sha256 = value => crypto.createHash('sha256').update(value).digest('hex')
const makePasswordHash = password => {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}
const verifyPassword = (password, stored) => {
  const [salt, expected] = String(stored).split(':')
  if (!salt || !expected) return false
  const actual = crypto.scryptSync(password, salt, 64).toString('hex')
  return crypto.timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'))
}

const auth = async (req, res, next) => {
  try {
    const header = req.get('authorization') || ''
    if (!header.startsWith('Bearer ')) return res.status(401).json({ error: 'authentication required' })
    const tokenHash = sha256(header.slice(7))
    const { rows } = await pool.query(
      'SELECT u.id,u.name,u.email,u.phone FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>NOW()',
      [tokenHash]
    )
    if (!rows[0]) return res.status(401).json({ error: 'invalid or expired session' })
    req.user = rows[0]
    next()
  } catch (e) { res.status(500).json({ error: e.message }) }
}

app.get('/health', (_req, res) => res.json({ service, status: 'ok' }))
app.get('/ready', async (_req, res) => {
  try { await pool.query('SELECT 1'); res.json({ service, status: 'ready' }) }
  catch { res.status(503).json({ service, status: 'not-ready' }) }
})

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body || {}
    if (!name || !password || (!email && !phone)) return res.status(400).json({ error: 'name, password and email or phone are required' })
    const passwordHash = makePasswordHash(password)
    const { rows } = await pool.query(
      'INSERT INTO users(name,email,phone,password_hash) VALUES($1,$2,$3,$4) RETURNING id,name,email,phone,created_at',
      [name, email || null, phone || null, passwordHash]
    )
    await pool.query('INSERT INTO carts(user_id) VALUES($1)', [rows[0].id])
    res.status(201).json({ user: rows[0] })
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'email or phone already exists' })
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/auth/login', async (req, res) => {
  try {
    const { identifier, password } = req.body || {}
    if (!identifier || !password) return res.status(400).json({ error: 'identifier and password are required' })
    const { rows } = await pool.query('SELECT * FROM users WHERE email=$1 OR phone=$1 LIMIT 1', [identifier])
    if (!rows[0] || !verifyPassword(password, rows[0].password_hash)) return res.status(401).json({ error: 'invalid credentials' })
    const token = crypto.randomBytes(32).toString('hex')
    await pool.query('INSERT INTO sessions(user_id,token_hash,expires_at) VALUES($1,$2,NOW()+INTERVAL \'7 days\')', [rows[0].id, sha256(token)])
    res.json({ token, user: { id: rows[0].id, name: rows[0].name, email: rows[0].email, phone: rows[0].phone } })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/auth/logout', auth, async (req, res) => {
  const header = req.get('authorization') || ''
  await pool.query('DELETE FROM sessions WHERE token_hash=$1', [sha256(header.slice(7))])
  res.json({ ok: true })
})
app.get('/api/auth/me', auth, (req, res) => res.json({ user: req.user }))

app.get('/api/products', async (_req, res) => {
  try { const { rows } = await pool.query('SELECT * FROM products ORDER BY id'); res.json(rows) }
  catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/cart', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT ci.id, ci.product_id, ci.quantity, p.name, p.price
      FROM cart_items ci JOIN carts c ON c.id=ci.cart_id JOIN products p ON p.id=ci.product_id
      WHERE c.user_id=$1 ORDER BY ci.id`, [req.user.id])
    const total = rows.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0)
    res.json({ items: rows, total })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/cart/items', auth, async (req, res) => {
  try {
    const { product_id, quantity = 1 } = req.body || {}
    if (!product_id || Number(quantity) < 1) return res.status(400).json({ error: 'product_id and positive quantity are required' })
    const cart = await pool.query('SELECT id FROM carts WHERE user_id=$1', [req.user.id])
    const cartId = cart.rows[0]?.id || (await pool.query('INSERT INTO carts(user_id) VALUES($1) RETURNING id', [req.user.id])).rows[0].id
    const { rows } = await pool.query(`
      INSERT INTO cart_items(cart_id,product_id,quantity) VALUES($1,$2,$3)
      ON CONFLICT(cart_id,product_id) DO UPDATE SET quantity=cart_items.quantity+EXCLUDED.quantity
      RETURNING *`, [cartId, product_id, Number(quantity)])
    res.status(201).json(rows[0])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.patch('/api/cart/items/:id', auth, async (req, res) => {
  try {
    const quantity = Number(req.body?.quantity)
    if (!Number.isInteger(quantity) || quantity < 1) return res.status(400).json({ error: 'quantity must be a positive integer' })
    const { rows } = await pool.query(`UPDATE cart_items ci SET quantity=$1 FROM carts c WHERE ci.id=$2 AND ci.cart_id=c.id AND c.user_id=$3 RETURNING ci.*`, [quantity, req.params.id, req.user.id])
    if (!rows[0]) return res.status(404).json({ error: 'cart item not found' })
    res.json(rows[0])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.delete('/api/cart/items/:id', auth, async (req, res) => {
  const result = await pool.query('DELETE FROM cart_items ci USING carts c WHERE ci.id=$1 AND ci.cart_id=c.id AND c.user_id=$2', [req.params.id, req.user.id])
  res.json({ deleted: result.rowCount })
})

app.post('/api/orders', auth, async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const cart = await client.query(`SELECT ci.product_id,ci.quantity,p.price FROM cart_items ci JOIN carts c ON c.id=ci.cart_id JOIN products p ON p.id=ci.product_id WHERE c.user_id=$1`, [req.user.id])
    if (!cart.rows.length) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'cart is empty' }) }
    const total = cart.rows.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0)
    const order = await client.query('INSERT INTO orders(user_id,status,total) VALUES($1,\'pending\',$2) RETURNING *', [req.user.id, total])
    for (const item of cart.rows) await client.query('INSERT INTO order_items(order_id,product_id,quantity,unit_price) VALUES($1,$2,$3,$4)', [order.rows[0].id, item.product_id, item.quantity, item.price])
    await client.query('DELETE FROM cart_items WHERE cart_id=(SELECT id FROM carts WHERE user_id=$1)', [req.user.id])
    await client.query('COMMIT')
    res.status(201).json(order.rows[0])
  } catch (e) { await client.query('ROLLBACK'); res.status(500).json({ error: e.message }) }
  finally { client.release() }
})

app.get('/api/orders', auth, async (req, res) => {
  try { const { rows } = await pool.query('SELECT * FROM orders WHERE user_id=$1 ORDER BY created_at DESC', [req.user.id]); res.json(rows) }
  catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/orders/:id', auth, async (req, res) => {
  try {
    const order = await pool.query('SELECT * FROM orders WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id])
    if (!order.rows[0]) return res.status(404).json({ error: 'order not found' })
    const items = await pool.query('SELECT oi.*,p.name FROM order_items oi JOIN products p ON p.id=oi.product_id WHERE oi.order_id=$1', [req.params.id])
    res.json({ ...order.rows[0], items: items.rows })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/addresses', auth, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM addresses WHERE user_id=$1 ORDER BY id DESC', [req.user.id])
  res.json(rows)
})
app.post('/api/addresses', auth, async (req, res) => {
  const { title, city, address, postal_code } = req.body || {}
  if (!title || !city || !address) return res.status(400).json({ error: 'title, city and address are required' })
  const { rows } = await pool.query('INSERT INTO addresses(user_id,title,city,address,postal_code) VALUES($1,$2,$3,$4,$5) RETURNING *', [req.user.id,title,city,address,postal_code || null])
  res.status(201).json(rows[0])
})

app.get('/api/stats', async (_req, res) => {
  try { const { rows } = await pool.query('SELECT COUNT(*)::int AS products FROM products'); res.json({ service, products: rows[0].products }) }
  catch (e) { res.status(500).json({ error: e.message }) }
})

const start = async () => {
  await pool.query(schemaSql)
  app.listen(port, () => console.log(`${service} listening on ${port}`))
}
start().catch(error => { console.error('startup failed', error); process.exit(1) })
