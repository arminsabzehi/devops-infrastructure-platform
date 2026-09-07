BEGIN;

CREATE TABLE IF NOT EXISTS sellers (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  rating NUMERIC(3,2) NOT NULL DEFAULT 4.50,
  rating_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS product_variants (
  id BIGSERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku TEXT UNIQUE,
  title TEXT NOT NULL DEFAULT '',
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS seller_offers (
  id BIGSERIAL PRIMARY KEY,
  variant_id BIGINT NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  seller_id BIGINT NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  price NUMERIC(14,2) NOT NULL,
  old_price NUMERIC(14,2),
  stock INTEGER NOT NULL DEFAULT 0,
  shipping_days INTEGER NOT NULL DEFAULT 2,
  is_buy_box BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS product_specifications (
  id BIGSERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  spec_group TEXT NOT NULL DEFAULT 'مشخصات فنی',
  spec_key TEXT NOT NULL,
  spec_value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS product_images (
  id BIGSERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS product_reviews (
  id BIGSERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_name VARCHAR(120) NOT NULL,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title VARCHAR(180) NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  pros TEXT[] NOT NULL DEFAULT '{}',
  cons TEXT[] NOT NULL DEFAULT '{}',
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  helpful_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_questions (
  id BIGSERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_name VARCHAR(120) NOT NULL,
  question TEXT NOT NULL,
  answer TEXT,
  answered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS product_variants_product_idx ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS seller_offers_variant_idx ON seller_offers(variant_id);
CREATE INDEX IF NOT EXISTS product_specifications_product_idx ON product_specifications(product_id);
CREATE INDEX IF NOT EXISTS product_images_product_idx ON product_images(product_id,sort_order);
CREATE INDEX IF NOT EXISTS product_reviews_product_idx ON product_reviews(product_id,created_at DESC);
CREATE INDEX IF NOT EXISTS product_questions_product_idx ON product_questions(product_id,created_at DESC);

INSERT INTO sellers(name,slug,rating,rating_count) VALUES
('فروشگاه دیجی‌نو','digino',4.70,1280),
('تأمین‌کننده دیجی‌نو','digino-supply',4.50,640)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO product_variants(product_id,sku,title,attributes)
SELECT p.id,'DN-'||LPAD(p.id::text,4,'0'),p.name,jsonb_build_object('رنگ','مشکی')
FROM products p
WHERE NOT EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id=p.id);

INSERT INTO seller_offers(variant_id,seller_id,price,old_price,stock,shipping_days,is_buy_box)
SELECT v.id,s.id,p.price,p.old_price,p.stock,2,TRUE
FROM product_variants v JOIN products p ON p.id=v.product_id
JOIN sellers s ON s.slug='digino'
WHERE NOT EXISTS (SELECT 1 FROM seller_offers o WHERE o.variant_id=v.id AND o.seller_id=s.id);

INSERT INTO seller_offers(variant_id,seller_id,price,old_price,stock,shipping_days,is_buy_box)
SELECT v.id,s.id,ROUND(p.price*1.02,2),p.old_price,GREATEST(p.stock-2,0),3,FALSE
FROM product_variants v JOIN products p ON p.id=v.product_id
JOIN sellers s ON s.slug='digino-supply'
WHERE NOT EXISTS (SELECT 1 FROM seller_offers o WHERE o.variant_id=v.id AND o.seller_id=s.id);

INSERT INTO product_images(product_id,url,sort_order)
SELECT p.id,p.image,0 FROM products p
WHERE p.image IS NOT NULL AND NOT EXISTS (SELECT 1 FROM product_images i WHERE i.product_id=p.id AND i.sort_order=0);

INSERT INTO product_images(product_id,url,sort_order)
SELECT p.id,p.image,1 FROM products p
WHERE p.image IS NOT NULL AND NOT EXISTS (SELECT 1 FROM product_images i WHERE i.product_id=p.id AND i.sort_order=1);

INSERT INTO product_specifications(product_id,spec_group,spec_key,spec_value)
SELECT p.id,'مشخصات فنی',x.k,x.v
FROM products p
CROSS JOIN LATERAL (VALUES
('برند',CASE
 WHEN p.name ILIKE '%Samsung%' THEN 'Samsung' WHEN p.name ILIKE '%Apple%' THEN 'Apple'
 WHEN p.name ILIKE '%Xiaomi%' THEN 'Xiaomi' WHEN p.name ILIKE '%Sony%' THEN 'Sony'
 WHEN p.name ILIKE '%Lenovo%' THEN 'Lenovo' WHEN p.name ILIKE '%LG%' THEN 'LG'
 WHEN p.name ILIKE '%JBL%' THEN 'JBL' WHEN p.name ILIKE '%Philips%' THEN 'Philips'
 WHEN p.name ILIKE '%Nike%' THEN 'Nike' WHEN p.name ILIKE '%Adidas%' THEN 'Adidas' ELSE 'Digino' END),
('مدل',p.name),('دسته‌بندی',p.category),('وضعیت کالا','نو'),('گارانتی','گارانتی معتبر فروشنده'),('رنگ','مشکی'),('موجودی',p.stock::text),('امتیاز',p.rating::text)
) x(k,v)
WHERE NOT EXISTS (SELECT 1 FROM product_specifications s WHERE s.product_id=p.id);

INSERT INTO product_specifications(product_id,spec_group,spec_key,spec_value)
SELECT p.id,'جزئیات محصول','ویژگی‌های کلیدی',CASE
WHEN p.name ILIKE '%iPhone%' THEN 'گوشی هوشمند Apple با نمایشگر OLED و دوربین پیشرفته'
WHEN p.name ILIKE '%Galaxy%' AND p.name ILIKE '%Tab%' THEN 'تبلت Samsung با نمایشگر بزرگ و مناسب کار و سرگرمی'
WHEN p.name ILIKE '%Galaxy%' THEN 'گوشی هوشمند Samsung با نمایشگر باکیفیت و امکانات روز'
WHEN p.name ILIKE '%Redmi%' THEN 'محصول Xiaomi با امکانات مناسب و ارزش خرید بالا'
WHEN p.name ILIKE '%MacBook%' THEN 'لپ‌تاپ Apple با طراحی سبک و پردازنده سری M'
WHEN p.name ILIKE '%ThinkPad%' OR p.name ILIKE '%IdeaPad%' OR p.name ILIKE '%Lenovo%' THEN 'لپ‌تاپ Lenovo مناسب کار و استفاده روزمره'
WHEN p.name ILIKE '%AirPods%' OR p.name ILIKE '%WH-%' OR p.name ILIKE '%Headphone%' THEN 'هدفون بی‌سیم با کیفیت صدای مناسب و امکانات کاربردی'
WHEN p.name ILIKE '%Watch%' THEN 'ساعت هوشمند با نمایشگر رنگی و امکانات پایش فعالیت'
WHEN p.name ILIKE '%OLED%' OR p.name ILIKE '%QLED%' OR p.category='تلویزیون' THEN 'تلویزیون هوشمند با تصویر 4K و امکانات سرگرمی'
WHEN p.name ILIKE '%PlayStation%' OR p.name ILIKE '%Xbox%' THEN 'کنسول بازی نسل جدید با حافظه SSD پرسرعت'
WHEN p.name ILIKE '%Nike%' OR p.name ILIKE '%Adidas%' OR p.category='پوشاک' THEN 'محصول مناسب استفاده روزمره با طراحی کاربردی'
ELSE 'محصول مناسب استفاده روزمره با طراحی کاربردی و کیفیت ساخت مناسب' END
FROM products p
WHERE NOT EXISTS (SELECT 1 FROM product_specifications s WHERE s.product_id=p.id AND s.spec_key='ویژگی‌های کلیدی');

-- Demo/local reviews for the project; they are not copied from Digikala.
INSERT INTO product_reviews(product_id,user_name,rating,title,body,pros,cons,verified,helpful_count)
SELECT p.id,x.user_name,x.rating,x.title,x.body,x.pros,x.cons,x.verified,x.helpful
FROM products p
CROSS JOIN LATERAL (VALUES
('محمد',5,'کیفیت ساخت خوب','در استفاده روزمره عملکرد محصول خوب و رضایت‌بخش بوده است.',ARRAY['کیفیت ساخت','کاربری راحت']::TEXT[],ARRAY['بسته‌بندی می‌توانست بهتر باشد']::TEXT[],TRUE,18),
('سارا',4,'ارزش خرید مناسب','در مجموع نسبت به قیمت و امکانات، انتخاب قابل قبولی است.',ARRAY['امکانات','ارزش خرید']::TEXT[],ARRAY['تنوع محدود']::TEXT[],TRUE,11),
('رضا',4,'تجربه خوب','محصول مطابق انتظار بود و راه‌اندازی آن ساده انجام شد.',ARRAY['راه‌اندازی آسان','طراحی']::TEXT[],ARRAY[]::TEXT[],FALSE,7)
) x(user_name,rating,title,body,pros,cons,verified,helpful)
WHERE NOT EXISTS (SELECT 1 FROM product_reviews r WHERE r.product_id=p.id);

INSERT INTO product_questions(product_id,user_name,question,answer,answered_at)
SELECT p.id,'کاربر دیجی‌نو',x.question,x.answer,NOW()
FROM products p
CROSS JOIN LATERAL (VALUES
('آیا کالا نو است؟','بله، کالا در وضعیت نو عرضه می‌شود.'),
('گارانتی محصول چگونه است؟','نوع و مدت گارانتی در پیشنهاد فروشنده نمایش داده می‌شود.')
) x(question,answer)
WHERE NOT EXISTS (SELECT 1 FROM product_questions q WHERE q.product_id=p.id);

COMMIT;
