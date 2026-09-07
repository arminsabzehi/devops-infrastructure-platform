BEGIN;

CREATE TABLE IF NOT EXISTS categories (
  id BIGSERIAL PRIMARY KEY,
  parent_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(140) UNIQUE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS brands (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(140) UNIQUE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS sellers (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  slug VARCHAR(160) UNIQUE NOT NULL,
  rating NUMERIC(2,1) NOT NULL DEFAULT 4.5,
  rating_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_variants (
  id BIGSERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku VARCHAR(100) UNIQUE NOT NULL,
  title VARCHAR(180) NOT NULL,
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS seller_offers (
  id BIGSERIAL PRIMARY KEY,
  seller_id BIGINT NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  variant_id BIGINT NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  price BIGINT NOT NULL CHECK (price >= 0),
  old_price BIGINT,
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  shipping_days SMALLINT NOT NULL DEFAULT 2 CHECK (shipping_days >= 0),
  is_buy_box BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(seller_id, variant_id)
);

CREATE TABLE IF NOT EXISTS product_specifications (
  id BIGSERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  spec_group VARCHAR(100) NOT NULL,
  spec_key VARCHAR(120) NOT NULL,
  spec_value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS product_images (
  id BIGSERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS categories_parent_idx ON categories(parent_id);
CREATE INDEX IF NOT EXISTS product_variants_product_idx ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS seller_offers_variant_idx ON seller_offers(variant_id);
CREATE INDEX IF NOT EXISTS seller_offers_seller_idx ON seller_offers(seller_id);
CREATE INDEX IF NOT EXISTS product_specs_product_idx ON product_specifications(product_id);

INSERT INTO categories(name,slug) VALUES
('موبایل','mobile'),('لپ‌تاپ','laptop'),('هدفون و هندزفری','headphones'),('ساعت هوشمند','smart-watch'),('تلویزیون','tv'),('کنسول بازی','gaming-console'),('لوازم خانه','home'),('پوشاک','fashion')
ON CONFLICT(slug) DO NOTHING;

INSERT INTO brands(name,slug) VALUES
('Samsung','samsung'),('Apple','apple'),('Sony','sony'),('Lenovo','lenovo'),('LG','lg'),('Xiaomi','xiaomi'),('JBL','jbl'),('Nike','nike')
ON CONFLICT(slug) DO NOTHING;

INSERT INTO sellers(name,slug,rating,rating_count) VALUES
('دیجی‌نو','digino',4.8,1280),('فروشگاه دیجیتال پارس','digital-pars',4.6,740),('مارکت پلاس','market-plus',4.5,520),('تک‌سنتر','tech-center',4.7,910)
ON CONFLICT(slug) DO NOTHING;

INSERT INTO product_variants(product_id,sku,title,attributes)
SELECT p.id, x.sku, x.title, x.attributes::jsonb
FROM products p
JOIN (VALUES
 ('nova-x-headphones','NOVA-X-BLK','مشکی','{"color":"مشکی"}'),
 ('aero-pro-watch','AERO-PRO-BLK','مشکی','{"color":"مشکی","size":"44mm"}'),
 ('urban-runner','URBAN-RUNNER-42','سایز 42','{"color":"مشکی","size":"42"}'),
 ('city-pack','CITY-PACK-GRY','خاکستری','{"color":"خاکستری"}'),
 ('milano-sunglasses','MILANO-BLK','مشکی','{"color":"مشکی"}'),
 ('pulse-speaker','PULSE-BLK','مشکی','{"color":"مشکی"}')
) AS x(slug,sku,title,attributes) ON p.slug=x.slug
ON CONFLICT(sku) DO NOTHING;

INSERT INTO seller_offers(seller_id,variant_id,price,old_price,stock,shipping_days,is_buy_box)
SELECT s.id,v.id,p.price,p.old_price,p.stock,2,(s.slug='digino')
FROM sellers s CROSS JOIN product_variants v JOIN products p ON p.id=v.product_id
ON CONFLICT(seller_id,variant_id) DO NOTHING;

INSERT INTO product_specifications(product_id,spec_group,spec_key,spec_value)
SELECT id,'مشخصات کلی','دسته‌بندی',category FROM products
WHERE NOT EXISTS (SELECT 1 FROM product_specifications ps WHERE ps.product_id=products.id);

COMMIT;
