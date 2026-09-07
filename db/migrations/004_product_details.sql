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
CREATE INDEX IF NOT EXISTS product_images_product_idx ON product_images(product_id, sort_order);
CREATE INDEX IF NOT EXISTS product_reviews_product_idx ON product_reviews(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS product_questions_product_idx ON product_questions(product_id, created_at DESC);

INSERT INTO sellers(name,slug,rating,rating_count)
VALUES ('فروشگاه دیجی‌نو','digino',4.70,1280),('تأمین‌کننده دیجی‌نو','digino-supply',4.50,640)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO product_variants(product_id,sku,title,attributes)
SELECT p.id,'DN-'||LPAD(p.id::text,4,'0'),p.name,jsonb_build_object('رنگ','مشکی')
FROM products p
WHERE NOT EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id=p.id);

INSERT INTO seller_offers(variant_id,seller_id,price,old_price,stock,shipping_days,is_buy_box)
SELECT v.id,(SELECT id FROM sellers WHERE slug='digino'),p.price,CASE WHEN p.old_price IS NOT NULL THEN p.old_price ELSE NULL END,p.stock,2,TRUE
FROM product_variants v JOIN products p ON p.id=v.product_id
WHERE NOT EXISTS (SELECT 1 FROM seller_offers o WHERE o.variant_id=v.id);

INSERT INTO seller_offers(variant_id,seller_id,price,old_price,stock,shipping_days,is_buy_box)
SELECT v.id,(SELECT id FROM sellers WHERE slug='digino-supply'),ROUND(p.price*1.02,2),p.old_price, GREATEST(p.stock-2,0),3,FALSE
FROM product_variants v JOIN products p ON p.id=v.product_id
WHERE NOT EXISTS (SELECT 1 FROM seller_offers o WHERE o.variant_id=v.id AND o.seller_id=(SELECT id FROM sellers WHERE slug='digino-supply'));

INSERT INTO product_images(product_id,url,sort_order)
SELECT p.id,p.image,0 FROM products p
WHERE NOT EXISTS (SELECT 1 FROM product_images i WHERE i.product_id=p.id AND i.sort_order=0);

INSERT INTO product_images(product_id,url,sort_order)
SELECT p.id,CASE
WHEN p.category='موبایل' THEN 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1100&q=85'
WHEN p.category='لپ‌تاپ' THEN 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1100&q=85'
WHEN p.category='هدفون و هندزفری' THEN 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1100&q=85'
WHEN p.category='ساعت هوشمند' THEN 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1100&q=85'
WHEN p.category='تلویزیون' THEN 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=1100&q=85'
WHEN p.category='کنسول بازی' THEN 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=1100&q=85'
ELSE p.image END,1 FROM products p
WHERE NOT EXISTS (SELECT 1 FROM product_images i WHERE i.product_id=p.id AND i.sort_order=1);

INSERT INTO product_images(product_id,url,sort_order)
SELECT p.id,CASE
WHEN p.category='موبایل' THEN 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?auto=format&fit=crop&w=1100&q=85'
WHEN p.category='لپ‌تاپ' THEN 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=1100&q=85'
WHEN p.category='هدفون و هندزفری' THEN 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=1100&q=85'
WHEN p.category='ساعت هوشمند' THEN 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=1100&q=85'
WHEN p.category='تلویزیون' THEN 'https://images.unsplash.com/photo-1593784991095-a205069470b6?auto=format&fit=crop&w=1100&q=85'
WHEN p.category='کنسول بازی' THEN 'https://images.unsplash.com/photo-1621259182978-fbf93132d53d?auto=format&fit=crop&w=1100&q=85'
ELSE p.image END,2 FROM products p
WHERE NOT EXISTS (SELECT 1 FROM product_images i WHERE i.product_id=p.id AND i.sort_order=2);

INSERT INTO product_specifications(product_id,spec_group,spec_key,spec_value)
SELECT p.id,'مشخصات فنی',x.k,x.v FROM products p
CROSS JOIN LATERAL (VALUES
('برند',CASE WHEN p.name ILIKE '%Samsung%' THEN 'Samsung' WHEN p.name ILIKE '%Apple%' THEN 'Apple' WHEN p.name ILIKE '%Xiaomi%' THEN 'Xiaomi' WHEN p.name ILIKE '%Sony%' THEN 'Sony' WHEN p.name ILIKE '%Lenovo%' THEN 'Lenovo' WHEN p.name ILIKE '%LG%' THEN 'LG' WHEN p.name ILIKE '%JBL%' THEN 'JBL' WHEN p.name ILIKE '%Philips%' THEN 'Philips' WHEN p.name ILIKE '%Nike%' THEN 'Nike' WHEN p.name ILIKE '%Adidas%' THEN 'Adidas' ELSE 'Digino' END),
('مدل',p.name),('دسته‌بندی',p.category),('وضعیت کالا','نو'),('گارانتی','گارانتی معتبر فروشنده'),('رنگ','مشکی')
) x(k,v) WHERE NOT EXISTS (SELECT 1 FROM product_specifications s WHERE s.product_id=p.id);

INSERT INTO product_specifications(product_id,spec_group,spec_key,spec_value)
SELECT p.id,'جزئیات محصول','ویژگی‌های کلیدی',CASE
WHEN p.slug='samsung-galaxy-a56-5g' THEN 'نمایشگر Super AMOLED، دوربین 50 مگاپیکسل و 5G'
WHEN p.slug='apple-iphone-16' THEN 'نمایشگر OLED، تراشه Apple A18 و دوربین 48 مگاپیکسل'
WHEN p.slug='xiaomi-redmi-note-14-pro' THEN 'نمایشگر AMOLED، دوربین 200 مگاپیکسل و شارژ سریع'
WHEN p.slug='samsung-galaxy-s25-ultra' THEN 'Dynamic AMOLED 2X، دوربین 200 مگاپیکسل و S Pen'
WHEN p.slug='lenovo-ideapad-slim-3' THEN 'لپ‌تاپ 15.6 اینچی مناسب کار اداری و استفاده روزمره'
WHEN p.slug='lenovo-loq-gaming' THEN 'لپ‌تاپ گیمینگ با گرافیک مجزا و سیستم خنک‌کننده قدرتمند'
WHEN p.slug='apple-macbook-air-m3' THEN 'تراشه Apple M3 و نمایشگر Liquid Retina'
WHEN p.slug='sony-wh-1000xm5' THEN 'حذف نویز فعال و صدای Hi-Res'
WHEN p.slug='apple-airpods-pro-2' THEN 'حذف نویز فعال، Transparency و صدای فضایی'
WHEN p.slug='jbl-tune-770nc' THEN 'حذف نویز فعال و شارژدهی طولانی'
WHEN p.slug='apple-watch-series-10' THEN 'نمایشگر OLED و پایش فعالیت و سلامت'
WHEN p.slug='samsung-galaxy-watch-7' THEN 'Wear OS، GPS و نمایشگر AMOLED'
WHEN p.slug='xiaomi-watch-2' THEN 'Wear OS، GPS و نمایشگر AMOLED'
WHEN p.slug='lg-oled-55' THEN 'پنل OLED، HDR و امکانات تلویزیون هوشمند'
WHEN p.slug='samsung-qled-55' THEN 'پنل QLED، رزولوشن 4K و HDR'
WHEN p.slug='xiaomi-tv-a-pro-55' THEN 'رزولوشن 4K، HDR و Google TV'
WHEN p.slug='playstation-5-slim' THEN 'SSD پرسرعت، خروجی 4K و کنترلر DualSense'
WHEN p.slug='xbox-series-x' THEN 'رزولوشن تا 4K و SSD پرسرعت'
WHEN p.slug='sony-dualsense' THEN 'بازخورد لمسی، تریگر تطبیقی و USB-C'
WHEN p.slug='xiaomi-robot-vacuum-s20' THEN 'نظافت هوشمند و کنترل از اپلیکیشن'
WHEN p.slug='philips-coffee-series-2200' THEN 'اسپرسوساز تمام‌اتوماتیک با آسیاب داخلی'
WHEN p.slug='philips-airfryer' THEN 'پخت با هوای داغ و تنظیم دما و زمان'
WHEN p.slug='nike-air-max' THEN 'کفی Air و رویه سبک'
WHEN p.slug='adidas-runfalcon' THEN 'رویه تنفس‌پذیر و کفی سبک'
WHEN p.slug='jbl-charge-5' THEN 'صدای قدرتمند و بدنه مقاوم در برابر آب'
WHEN p.slug='sony-srs-xb100' THEN 'اسپیکر قابل حمل Bluetooth'
WHEN p.slug='lg-ultragear-27' THEN 'مانیتور 27 اینچ گیمینگ با نرخ نوسازی بالا'
WHEN p.slug='samsung-tab-s9-fe' THEN 'تبلت 10.9 اینچی با S Pen'
ELSE 'محصول مناسب استفاده روزمره' END
FROM products p WHERE NOT EXISTS (SELECT 1 FROM product_specifications s WHERE s.product_id=p.id AND s.spec_key='ویژگی‌های کلیدی');

-- These are demo reviews for the local project, not copied Digikala reviews.
INSERT INTO product_reviews(product_id,user_name,rating,title,body,pros,cons,verified,helpful_count)
SELECT p.id,x.user_name,x.rating,x.title,x.body,x.pros,x.cons,x.verified,x.helpful FROM products p
CROSS JOIN LATERAL (VALUES
('محمد',5,'کیفیت ساخت خوب','در استفاده روزمره عملکرد محصول خوب و رضایت‌بخش بوده است.',ARRAY['کیفیت ساخت','کاربری راحت']::TEXT[],ARRAY['بسته‌بندی می‌توانست بهتر باشد']::TEXT[],TRUE,18),
('سارا',4,'ارزش خرید مناسب','در مجموع نسبت به قیمت و امکانات، انتخاب قابل قبولی است.',ARRAY['امکانات','ارزش خرید']::TEXT[],ARRAY['تنوع محدود']::TEXT[],TRUE,11),
('رضا',4,'تجربه خوب','محصول مطابق انتظار بود و راه‌اندازی آن ساده انجام شد.',ARRAY['راه‌اندازی آسان','طراحی']::TEXT[],ARRAY[]::TEXT[],FALSE,7)
) x(user_name,rating,title,body,pros,cons,verified,helpful)
WHERE NOT EXISTS (SELECT 1 FROM product_reviews r WHERE r.product_id=p.id);

INSERT INTO product_questions(product_id,user_name,question,answer,answered_at)
SELECT p.id,'کاربر دیجی‌نو',x.question,x.answer,NOW() FROM products p
CROSS JOIN LATERAL (VALUES
('آیا کالا نو است؟','بله، کالا در وضعیت نو عرضه می‌شود.'),
('گارانتی محصول چگونه است؟','نوع و مدت گارانتی در پیشنهاد فروشنده نمایش داده می‌شود.')
) x(question,answer)
WHERE NOT EXISTS (SELECT 1 FROM product_questions q WHERE q.product_id=p.id);

COMMIT;
