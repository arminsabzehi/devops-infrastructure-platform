BEGIN;

UPDATE products SET category='هدفون و هندزفری' WHERE slug IN ('nova-x-headphones','pulse-speaker');
UPDATE products SET category='ساعت هوشمند' WHERE slug='aero-pro-watch';
UPDATE products SET category='پوشاک' WHERE slug IN ('urban-runner','city-pack','milano-sunglasses');

INSERT INTO products(name,slug,category,price,old_price,image,badge,stock,rating,review_count,description) VALUES
('گوشی موبایل Samsung Galaxy A56 5G','samsung-galaxy-a56-5g','موبایل',24990000,27990000,'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=85','پرفروش',35,4.7,1832,'گوشی میان‌رده قدرتمند سامسونگ با نمایشگر باکیفیت و دوربین حرفه‌ای.'),
('گوشی موبایل Apple iPhone 16','apple-iphone-16','موبایل',69990000,74990000,'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?auto=format&fit=crop&w=900&q=85','جدید',18,4.9,2145,'آیفون 16 با عملکرد سریع و طراحی مدرن.'),
('گوشی موبایل Xiaomi Redmi Note 14 Pro','xiaomi-redmi-note-14-pro','موبایل',18990000,21990000,'https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=900&q=85','٪۱۴ تخفیف',44,4.6,987,'گوشی اقتصادی با دوربین و نمایشگر قدرتمند.'),
('گوشی موبایل Samsung Galaxy S25 Ultra','samsung-galaxy-s25-ultra','موبایل',89990000,94990000,'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=900&q=85','ویژه',12,4.9,756,'پرچمدار سامسونگ با سخت‌افزار قدرتمند.'),
('لپ تاپ Lenovo IdeaPad Slim 3','lenovo-ideapad-slim-3','لپ‌تاپ',42990000,45990000,'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=85','پیشنهاد ویژه',16,4.6,642,'لپ‌تاپ مناسب کار و استفاده روزمره.'),
('لپ تاپ Lenovo LOQ Gaming','lenovo-loq-gaming','لپ‌تاپ',68990000,72990000,'https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=900&q=85','گیمینگ',9,4.8,418,'لپ‌تاپ گیمینگ قدرتمند برای بازی و تولید محتوا.'),
('لپ تاپ Apple MacBook Air M3','apple-macbook-air-m3','لپ‌تاپ',79990000,84990000,'https://images.unsplash.com/photo-1517336714739-489689fd1ca8?auto=format&fit=crop&w=900&q=85','محبوب',11,4.9,1104,'مک‌بوک سبک و سریع با تراشه Apple Silicon.'),
('هدفون Sony WH-1000XM5','sony-wh-1000xm5','هدفون و هندزفری',18490000,20990000,'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=85','٪۱۲ تخفیف',21,4.9,927,'هدفون بی‌سیم حرفه‌ای با حذف نویز فعال.'),
('هدفون Apple AirPods Pro 2','apple-airpods-pro-2','هدفون و هندزفری',16990000,18990000,'https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?auto=format&fit=crop&w=900&q=85','پرفروش',27,4.8,1538,'ایربادز حرفه‌ای اپل با حذف نویز.'),
('هدفون JBL Tune 770NC','jbl-tune-770nc','هدفون و هندزفری',6990000,7990000,'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=900&q=85','٪۱۳ تخفیف',38,4.6,512,'هدفون بی‌سیم JBL با شارژدهی طولانی.'),
('ساعت هوشمند Apple Watch Series 10','apple-watch-series-10','ساعت هوشمند',32990000,35990000,'https://images.unsplash.com/photo-1551816230-ef5deaed4a26?auto=format&fit=crop&w=900&q=85','جدید',14,4.8,411,'ساعت هوشمند پیشرفته اپل.'),
('ساعت هوشمند Samsung Galaxy Watch 7','samsung-galaxy-watch-7','ساعت هوشمند',18990000,21990000,'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=85','محبوب',23,4.7,638,'ساعت هوشمند سامسونگ با امکانات ورزشی و سلامتی.'),
('ساعت هوشمند Xiaomi Watch 2','xiaomi-watch-2','ساعت هوشمند',12990000,14990000,'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=900&q=85','٪۱۳ تخفیف',31,4.5,284,'ساعت هوشمند اقتصادی شیائومی.'),
('تلویزیون LG OLED 55 اینچ','lg-oled-55','تلویزیون',58990000,63990000,'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=900&q=85','٪۸ تخفیف',8,4.8,218,'تلویزیون OLED با کیفیت تصویر فوق‌العاده.'),
('تلویزیون Samsung QLED 55 اینچ','samsung-qled-55','تلویزیون',47990000,52990000,'https://images.unsplash.com/photo-1593784991095-a205069470b6?auto=format&fit=crop&w=900&q=85','پرفروش',10,4.7,364,'تلویزیون هوشمند QLED سامسونگ.'),
('تلویزیون Xiaomi TV A Pro 55','xiaomi-tv-a-pro-55','تلویزیون',32990000,36990000,'https://images.unsplash.com/photo-1601944177325-f8867652837f?auto=format&fit=crop&w=900&q=85','پیشنهاد ویژه',13,4.5,176,'تلویزیون هوشمند اقتصادی شیائومی.'),
('کنسول بازی PlayStation 5 Slim','playstation-5-slim','کنسول بازی',38990000,41990000,'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=900&q=85','پرفروش',7,4.9,1504,'کنسول بازی نسل جدید سونی.'),
('کنسول Xbox Series X','xbox-series-x','کنسول بازی',44990000,47990000,'https://images.unsplash.com/photo-1621259182978-fbf93132d53d?auto=format&fit=crop&w=900&q=85','محبوب',6,4.8,734,'کنسول قدرتمند مایکروسافت.'),
('دسته بازی Sony DualSense','sony-dualsense','کنسول بازی',4990000,5490000,'https://images.unsplash.com/photo-1600080972464-8e5e8c4a0c9b?auto=format&fit=crop&w=900&q=85','٪۹ تخفیف',25,4.7,621,'دسته بازی بی‌سیم DualSense.'),
('جاروبرقی رباتیک Xiaomi S20','xiaomi-robot-vacuum-s20','لوازم خانه',15990000,17990000,'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=900&q=85','جدید',12,4.6,305,'جاروبرقی رباتیک هوشمند برای نظافت روزانه.'),
('قهوه‌ساز Philips Series 2200','philips-coffee-series-2200','لوازم خانه',22990000,25990000,'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=900&q=85','٪۱۱ تخفیف',9,4.7,194,'قهوه‌ساز اتوماتیک خانگی.'),
('سرخ‌کن بدون روغن Philips','philips-airfryer','لوازم خانه',8990000,9990000,'https://images.unsplash.com/photo-1585515320310-259814833e62?auto=format&fit=crop&w=900&q=85','محبوب',17,4.6,447,'سرخ‌کن بدون روغن مناسب آشپزی سالم.'),
('کفش ورزشی Nike Air Max','nike-air-max','پوشاک',8990000,9990000,'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=85','٪۱۰ تخفیف',28,4.6,287,'کفش ورزشی سبک و راحت نایکی.'),
('کتانی Adidas Runfalcon','adidas-runfalcon','پوشاک',6490000,7290000,'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=85','پرفروش',19,4.5,352,'کتانی روزمره و ورزشی.'),
('کوله‌پشتی City Pack Pro','city-pack-pro','پوشاک',2490000,2990000,'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=85','پیشنهاد ویژه',22,4.7,153,'کوله‌پشتی شهری مقاوم و جادار.'),
('عینک آفتابی Milano Classic','milano-classic','پوشاک',2190000,2590000,'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=900&q=85','محبوب',14,4.5,41,'عینک آفتابی با طراحی کلاسیک.'),
('اسپیکر JBL Charge 5','jbl-charge-5','هدفون و هندزفری',7290000,8190000,'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=900&q=85','٪۱۱ تخفیف',24,4.7,534,'اسپیکر قابل حمل با صدای قدرتمند.'),
('اسپیکر Sony SRS-XB100','sony-srs-xb100','هدفون و هندزفری',4290000,4990000,'https://images.unsplash.com/photo-1589256469067-ea99122bbdc4?auto=format&fit=crop&w=900&q=85','جدید',32,4.6,268,'اسپیکر کوچک و قابل حمل سونی.'),
('مانیتور LG UltraGear 27','lg-ultragear-27','لپ‌تاپ',18990000,20990000,'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=900&q=85','گیمینگ',15,4.8,389,'مانیتور گیمینگ با نرخ نوسازی بالا.'),
('تبلت Samsung Galaxy Tab S9 FE','samsung-tab-s9-fe','موبایل',24990000,27990000,'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=900&q=85','پیشنهاد ویژه',13,4.7,412,'تبلت سامسونگ مناسب کار و سرگرمی.');

INSERT INTO product_variants(product_id,sku,title,attributes)
SELECT p.id, upper(replace(p.slug,'-',''))||'-STD','نسخه استاندارد','{"variant":"standard"}'::jsonb
FROM products p
WHERE NOT EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id=p.id);

INSERT INTO seller_offers(seller_id,variant_id,price,old_price,stock,shipping_days,is_buy_box)
SELECT s.id,v.id,p.price,p.old_price,GREATEST(1,p.stock-(s.id::int-1)*2),CASE WHEN s.id=1 THEN 1 ELSE 2 END,(s.id=1)
FROM product_variants v JOIN products p ON p.id=v.product_id CROSS JOIN sellers s
WHERE v.sku LIKE '%-STD'
ON CONFLICT(seller_id,variant_id) DO NOTHING;

INSERT INTO product_specifications(product_id,spec_group,spec_key,spec_value)
SELECT p.id,'مشخصات کلی','دسته‌بندی',p.category
FROM products p
WHERE NOT EXISTS (SELECT 1 FROM product_specifications ps WHERE ps.product_id=p.id AND ps.spec_key='دسته‌بندی');

COMMIT;
