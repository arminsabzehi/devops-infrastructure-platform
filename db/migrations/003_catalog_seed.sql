BEGIN;

UPDATE products SET category='هدفون و هندزفری' WHERE slug='nova-x-headphones';
UPDATE products SET category='ساعت هوشمند' WHERE slug='aero-pro-watch';
UPDATE products SET category='پوشاک' WHERE slug='urban-runner';
UPDATE products SET category='لوازم خانه' WHERE slug='city-pack';
UPDATE products SET category='پوشاک' WHERE slug='milano-sunglasses';
UPDATE products SET category='هدفون و هندزفری' WHERE slug='pulse-speaker';

UPDATE products SET description='هدفون بی‌سیم با حذف نویز فعال، کیفیت صدای بالا و شارژدهی طولانی.' WHERE slug='nova-x-headphones';
UPDATE products SET description='ساعت هوشمند چندمنظوره با پایش فعالیت، نمایش اعلان‌ها و طراحی مدرن.' WHERE slug='aero-pro-watch';
UPDATE products SET description='کتانی سبک و راحت برای استفاده روزمره و فعالیت‌های ورزشی.' WHERE slug='urban-runner';
UPDATE products SET description='کوله‌پشتی شهری جادار با محفظه لپ‌تاپ و مقاومت مناسب برای استفاده روزانه.' WHERE slug='city-pack';
UPDATE products SET description='عینک آفتابی با طراحی کلاسیک و مناسب استفاده روزمره.' WHERE slug='milano-sunglasses';
UPDATE products SET description='اسپیکر قابل حمل با صدای قدرتمند، باتری مناسب و طراحی مقاوم.' WHERE slug='pulse-speaker';

COMMIT;
