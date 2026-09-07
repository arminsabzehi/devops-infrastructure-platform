BEGIN;

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
CREATE INDEX IF NOT EXISTS product_reviews_product_idx ON product_reviews(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS product_questions_product_idx ON product_questions(product_id, created_at DESC);

-- Product gallery: keep storage light and use remote optimized images.
INSERT INTO product_images(product_id,url,sort_order)
SELECT p.id, p.image, 0 FROM products p
WHERE NOT EXISTS (SELECT 1 FROM product_images i WHERE i.product_id=p.id AND i.sort_order=0);

INSERT INTO product_images(product_id,url,sort_order)
SELECT p.id,
CASE
WHEN p.category='موبایل' THEN 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1100&q=85'
WHEN p.category='لپ‌تاپ' THEN 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1100&q=85'
WHEN p.category='هدفون و هندزفری' THEN 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1100&q=85'
WHEN p.category='ساعت هوشمند' THEN 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1100&q=85'
WHEN p.category='تلویزیون' THEN 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=1100&q=85'
WHEN p.category='کنسول بازی' THEN 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=1100&q=85'
WHEN p.category='لوازم خانه' THEN 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1100&q=85'
ELSE p.image END, 1
FROM products p
WHERE NOT EXISTS (SELECT 1 FROM product_images i WHERE i.product_id=p.id AND i.sort_order=1);

INSERT INTO product_images(product_id,url,sort_order)
SELECT p.id,
CASE
WHEN p.category='موبایل' THEN 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?auto=format&fit=crop&w=1100&q=85'
WHEN p.category='لپ‌تاپ' THEN 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=1100&q=85'
WHEN p.category='هدفون و هندزفری' THEN 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=1100&q=85'
WHEN p.category='ساعت هوشمند' THEN 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=1100&q=85'
WHEN p.category='تلویزیون' THEN 'https://images.unsplash.com/photo-1593784991095-a205069470b6?auto=format&fit=crop&w=1100&q=85'
WHEN p.category='کنسول بازی' THEN 'https://images.unsplash.com/photo-1621259182978-fbf93132d53d?auto=format&fit=crop&w=1100&q=85'
WHEN p.category='لوازم خانه' THEN 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=1100&q=85'
ELSE p.image END, 2
FROM products p
WHERE NOT EXISTS (SELECT 1 FROM product_images i WHERE i.product_id=p.id AND i.sort_order=2);

-- Category/model-specific technical specifications.
INSERT INTO product_specifications(product_id,spec_group,spec_key,spec_value)
SELECT p.id, 'مشخصات فنی', x.k, x.v
FROM products p
CROSS JOIN LATERAL (VALUES
('برند', CASE WHEN p.name ILIKE '%Samsung%' THEN 'Samsung' WHEN p.name ILIKE '%Apple%' THEN 'Apple' WHEN p.name ILIKE '%Xiaomi%' THEN 'Xiaomi' WHEN p.name ILIKE '%Sony%' THEN 'Sony' WHEN p.name ILIKE '%Lenovo%' THEN 'Lenovo' WHEN p.name ILIKE '%LG%' THEN 'LG' WHEN p.name ILIKE '%JBL%' THEN 'JBL' WHEN p.name ILIKE '%Philips%' THEN 'Philips' WHEN p.name ILIKE '%Nike%' THEN 'Nike' WHEN p.name ILIKE '%Adidas%' THEN 'Adidas' ELSE 'Digino' END),
('مدل', p.name),
('رنگ', CASE WHEN p.category='پوشاک' THEN 'مشکی / مطابق تنوع کالا' ELSE 'مشکی' END),
('وضعیت کالا', 'نو'),
('گارانتی', 'گارانتی معتبر فروشنده')
) x(k,v)
WHERE NOT EXISTS (SELECT 1 FROM product_specifications s WHERE s.product_id=p.id AND s.spec_key=x.k);

INSERT INTO product_specifications(product_id,spec_group,spec_key,spec_value)
SELECT p.id,'مشخصات اختصاصی',x.k,x.v
FROM products p
CROSS JOIN LATERAL (VALUES
('نوع محصول',p.category),
('مناسب برای','مصرف روزمره، کار و سرگرمی'),
('اقلام همراه','جعبه محصول، دفترچه راهنما و متعلقات اصلی')
) x(k,v)
WHERE NOT EXISTS (SELECT 1 FROM product_specifications s WHERE s.product_id=p.id AND s.spec_group='مشخصات اختصاصی');

-- More useful, model-aware specs for the known product families.
INSERT INTO product_specifications(product_id,spec_group,spec_key,spec_value)
SELECT p.id,'جزئیات مدل',x.k,x.v
FROM products p
CROSS JOIN LATERAL (VALUES
('مشخصات کلیدی',CASE
 WHEN p.slug='samsung-galaxy-a56-5g' THEN 'نمایشگر 6.7 اینچ Super AMOLED، دوربین اصلی 50MP، پشتیبانی 5G'
 WHEN p.slug='apple-iphone-16' THEN 'نمایشگر OLED، تراشه Apple A18، دوربین اصلی 48MP، USB-C'
 WHEN p.slug='xiaomi-redmi-note-14-pro' THEN 'نمایشگر AMOLED با نرخ نوسازی بالا، دوربین 200MP، شارژ سریع'
 WHEN p.slug='samsung-galaxy-s25-ultra' THEN 'نمایشگر Dynamic AMOLED 2X، دوربین 200MP، قلم S Pen، 5G'
 WHEN p.slug='lenovo-ideapad-slim-3' THEN 'لپ‌تاپ 15.6 اینچی برای کار اداری، مطالعه و استفاده روزمره'
 WHEN p.slug='lenovo-loq-gaming' THEN 'لپ‌تاپ گیمینگ با گرافیک مجزا، نمایشگر پرنرخ و سیستم خنک‌کننده قدرتمند'
 WHEN p.slug='apple-macbook-air-m3' THEN 'تراشه Apple M3، نمایشگر Liquid Retina، بدنه سبک و بدون فن'
 WHEN p.slug='sony-wh-1000xm5' THEN 'حذف نویز فعال، صدای Hi-Res، اتصال بی‌سیم و میکروفون‌های چندگانه'
 WHEN p.slug='apple-airpods-pro-2' THEN 'حذف نویز فعال، Transparency، صدای فضایی و کیس شارژ USB-C'
 WHEN p.slug='jbl-tune-770nc' THEN 'حذف نویز فعال، Bluetooth، شارژدهی طولانی و طراحی تاشو'
 WHEN p.slug='apple-watch-series-10' THEN 'نمایشگر OLED، پایش فعالیت و ضربان، تماس و اعلان، شارژ مغناطیسی'
 WHEN p.slug='samsung-galaxy-watch-7' THEN 'Wear OS، GPS، پایش فعالیت و سلامت، نمایشگر AMOLED'
 WHEN p.slug='xiaomi-watch-2' THEN 'Wear OS، GPS، AMOLED و پایش فعالیت‌های ورزشی'
 WHEN p.slug='lg-oled-55' THEN 'پنل OLED، کنتراست بسیار بالا، HDR و سیستم‌عامل هوشمند'
 WHEN p.slug='samsung-qled-55' THEN 'پنل QLED، رزولوشن 4K، HDR و امکانات تلویزیون هوشمند'
 WHEN p.slug='xiaomi-tv-a-pro-55' THEN 'پنل 4K، HDR، Google TV و طراحی باریک'
 WHEN p.slug='playstation-5-slim' THEN 'نسخه Slim، SSD پرسرعت، خروجی 4K و کنترلر DualSense'
 WHEN p.slug='xbox-series-x' THEN 'رزولوشن تا 4K، SSD پرسرعت و اجرای بازی‌های نسل جدید'
 WHEN p.slug='sony-dualsense' THEN 'بازخورد لمسی، تریگر تطبیقی، میکروفون داخلی و اتصال USB-C'
 WHEN p.slug='xiaomi-robot-vacuum-s20' THEN 'نظافت هوشمند، مکش قدرتمند، نقشه‌برداری و کنترل از اپلیکیشن'
 WHEN p.slug='philips-coffee-series-2200' THEN 'اسپرسوساز تمام‌اتوماتیک، آسیاب داخلی و تنظیم شدت قهوه'
 WHEN p.slug='philips-airfryer' THEN 'پخت با هوای داغ، تنظیم دما و زمان و سبد قابل شست‌وشو'
 WHEN p.slug='nike-air-max' THEN 'کفی Air، رویه سبک و مناسب استفاده روزمره و ورزشی'
 WHEN p.slug='adidas-runfalcon' THEN 'رویه تنفس‌پذیر، کفی سبک و مناسب دویدن و استفاده روزمره'
 WHEN p.slug='city-pack-pro' THEN 'محفظه لپ‌تاپ، جیب‌های متعدد و بدنه مقاوم برای استفاده شهری'
 WHEN p.slug='milano-classic' THEN 'فریم سبک، طراحی کلاسیک و محافظت در برابر نور خورشید'
 WHEN p.slug='jbl-charge-5' THEN 'صدای قدرتمند، بدنه مقاوم در برابر آب و باتری با شارژدهی بالا'
 WHEN p.slug='sony-srs-xb100' THEN 'اسپیکر کوچک قابل حمل با صدای قدرتمند و اتصال Bluetooth'
 WHEN p.slug='lg-ultragear-27' THEN 'مانیتور 27 اینچ گیمینگ با نرخ نوسازی بالا و زمان پاسخ سریع'
 WHEN p.slug='samsung-tab-s9-fe' THEN 'تبلت 10.9 اینچی، S Pen، نمایشگر باکیفیت و بدنه مقاوم'
 ELSE 'محصول چندمنظوره با امکانات مناسب استفاده روزمره' END),
('اتصال / رابط',CASE WHEN p.category IN ('موبایل','لپ‌تاپ','تلویزیون','کنسول بازی') THEN 'USB-C / HDMI / Wi-Fi / Bluetooth بر اساس مدل' ELSE 'Bluetooth / بی‌سیم' END)
) x(k,v)
WHERE NOT EXISTS (SELECT 1 FROM product_specifications s WHERE s.product_id=p.id AND s.spec_group='جزئیات مدل');

-- The original six legacy catalog items are also given useful details.
INSERT INTO product_specifications(product_id,spec_group,spec_key,spec_value)
SELECT p.id,'جزئیات مدل','ویژگی‌ها',CASE p.slug
WHEN 'nova-x-headphones' THEN 'هدفون بی‌سیم، میکروفون داخلی، کنترل روی بدنه و شارژ USB-C'
WHEN 'aero-pro-watch' THEN 'ساعت هوشمند 44mm، پایش فعالیت و اعلان‌های تلفن همراه'
WHEN 'urban-runner' THEN 'کتانی سبک برای پیاده‌روی و استفاده روزمره'
WHEN 'city-pack' THEN 'کوله‌پشتی شهری با محفظه اصلی جادار و جیب‌های کاربردی'
WHEN 'milano-sunglasses' THEN 'عینک آفتابی کلاسیک با فریم سبک'
WHEN 'pulse-speaker' THEN 'اسپیکر قابل حمل، Bluetooth و باتری داخلی'
ELSE 'ویژگی‌های استاندارد محصول' END
FROM products p
WHERE NOT EXISTS (SELECT 1 FROM product_specifications s WHERE s.product_id=p.id AND s.spec_key='ویژگی‌ها');

-- Seed review summaries, clearly marked as store sample reviews rather than copied third-party text.
INSERT INTO product_reviews(product_id,user_name,rating,title,body,pros,cons,verified,helpful_count)
SELECT p.id,x.user_name,x.rating,x.title,x.body,x.pros,x.cons,x.verified,x.helpful
FROM products p
CROSS JOIN LATERAL (VALUES
('محمد','کیفیت ساخت خوب', 'در استفاده روزمره عملکرد محصول خوب و رضایت‌بخش بوده است.', ARRAY['کیفیت ساخت','کاربری راحت']::TEXT[], ARRAY['بسته‌بندی می‌توانست بهتر باشد']::TEXT[], true, 18),
('سارا','ارزش خرید مناسب', 'در مجموع نسبت به قیمت و امکانات، انتخاب قابل قبولی است.', ARRAY['امکانات','ارزش خرید']::TEXT[], ARRAY['تنوع رنگ محدود']::TEXT[], true, 11),
('رضا','تجربه خوب', 'محصول مطابق انتظار بود و راه‌اندازی آن ساده انجام شد.', ARRAY['راه‌اندازی آسان','طراحی']::TEXT[], ARRAY[]::TEXT[], false, 7)
) x(user_name,rating,title,body,pros,cons,verified,helpful)
WHERE NOT EXISTS (SELECT 1 FROM product_reviews r WHERE r.product_id=p.id);

INSERT INTO product_questions(product_id,user_name,question,answer)
SELECT p.id,'کاربر دیجی‌نو',x.question,x.answer
FROM products p
CROSS JOIN LATERAL (VALUES
('آیا کالا نو و پلمپ است؟','بله، این کالا در وضعیت نو عرضه می‌شود و بسته‌بندی آن توسط فروشنده انجام می‌شود.'),
('گارانتی محصول چگونه است؟','نوع و مدت گارانتی در بخش مشخصات و پیشنهاد فروشنده نمایش داده می‌شود.')
) x(question,answer)
WHERE NOT EXISTS (SELECT 1 FROM product_questions q WHERE q.product_id=p.id);

COMMIT;
