import express from 'express';
import cors from 'cors';
import pg from 'pg';

const { Pool } = pg;
const app = express();
const port = process.env.PORT || 3000;
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://infra:infra@db:5432/infra' });

app.use(cors());
app.use(express.json());

app.get('/api/health', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT NOW() AS time');
    res.json({ status: 'ok', database: 'connected', time: rows[0].time });
  } catch (error) {
    res.status(503).json({ status: 'degraded', database: 'unavailable', error: error.message });
  }
});

app.get('/api/projects', async (_req, res) => {
  const { rows } = await pool.query('SELECT id, title, slug, description, status, stack, created_at FROM projects ORDER BY id');
  res.json(rows);
});

app.post('/api/projects', async (req, res) => {
  const { title, slug, description, status = 'active', stack = [] } = req.body;
  if (!title || !slug) return res.status(400).json({ error: 'title and slug are required' });
  const { rows } = await pool.query(
    'INSERT INTO projects(title, slug, description, status, stack) VALUES($1,$2,$3,$4,$5) RETURNING *',
    [title, slug, description || '', status, stack]
  );
  res.status(201).json(rows[0]);
});

app.get('/api/stats', async (_req, res) => {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS projects FROM projects');
  res.json({ projects: rows[0].projects, services: 6, layers: 4, database: 'PostgreSQL' });
});

app.listen(port, () => console.log(`API listening on ${port}`));
