CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  title VARCHAR(120) NOT NULL,
  slug VARCHAR(120) UNIQUE NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  stack TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO projects (title, slug, description, status, stack) VALUES
('Kubernetes Operations Platform', 'kubernetes-ops', 'Container orchestration, service exposure and workload operations.', 'active', ARRAY['Kubernetes','Docker','Ingress']),
('Backup & Recovery', 'backup-recovery', 'Enterprise backup architecture with recovery and protection workflows.', 'active', ARRAY['Veeam','Veritas','DataDomain']),
('Virtualization Infrastructure', 'virtualization', 'VMware based compute, VDI and infrastructure operations.', 'active', ARRAY['VMware','HPE','SAN'])
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(180) NOT NULL,
  slug VARCHAR(180) UNIQUE NOT NULL,
  category VARCHAR(80) NOT NULL,
  price BIGINT NOT NULL CHECK (price >= 0),
  old_price BIGINT CHECK (old_price IS NULL OR old_price >= price),
  image TEXT NOT NULL DEFAULT '',
  badge VARCHAR(60) NOT NULL DEFAULT '',
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  rating NUMERIC(2,1) NOT NULL DEFAULT 4.5,
  review_count INTEGER NOT NULL DEFAULT 0,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO products (name, slug, category, price, old_price, image, badge, stock, rating, review_count, description) VALUES
('هدفون بی‌سیم Nova X', 'nova-x-headphones', 'دیجیتال', 3890000, 4590000, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=85', 'پرفروش', 42, 4.8, 128, 'هدفون بی‌سیم با کیفیت صدای بالا و شارژدهی مناسب.'),
('ساعت هوشمند Aero Pro', 'aero-pro-watch', 'دیجیتال', 5290000, 6190000, 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=900&q=85', 'جدید', 25, 4.7, 86, 'ساعت هوشمند چندمنظوره با طراحی مدرن.'),
('کتانی Urban Runner', 'urban-runner', 'پوشاک', 2790000, 3290000, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=85', '٪۱۵ تخفیف', 31, 4.6, 74, 'کتانی سبک مناسب استفاده روزمره.'),
('کوله‌پشتی City Pack', 'city-pack', 'اکسسوری', 1690000, 1990000, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=85', 'پیشنهاد ویژه', 18, 4.7, 53, 'کوله‌پشتی شهری جادار و مقاوم.'),
('عینک آفتابی Milano', 'milano-sunglasses', 'اکسسوری', 2190000, 2590000, 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=900&q=85', 'محبوب', 14, 4.5, 41, 'عینک آفتابی با طراحی کلاسیک.'),
('اسپیکر قابل حمل Pulse', 'pulse-speaker', 'صوتی', 2490000, 2990000, 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=900&q=85', '٪۱۰ تخفیف', 37, 4.8, 97, 'اسپیکر قابل حمل با صدای قدرتمند.')
ON CONFLICT (slug) DO NOTHING;
