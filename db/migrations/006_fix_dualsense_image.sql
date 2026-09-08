BEGIN;

UPDATE products
SET image='https://images.unsplash.com/photo-1592840496694-26c035b52b8c?auto=format&fit=crop&w=900&q=85'
WHERE slug='sony-dualsense';

UPDATE product_images
SET url='https://images.unsplash.com/photo-1592840496694-26c035b52b8c?auto=format&fit=crop&w=900&q=85'
WHERE product_id=(SELECT id FROM products WHERE slug='sony-dualsense');

COMMIT;
