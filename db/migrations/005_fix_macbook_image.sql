BEGIN;

UPDATE products
SET image='https://images.unsplash.com/photo-1504198070170-4ca53bb1c1fa?auto=format&fit=crop&w=900&q=85'
WHERE slug='apple-macbook-air-m3';

UPDATE product_images
SET url='https://images.unsplash.com/photo-1504198070170-4ca53bb1c1fa?auto=format&fit=crop&w=900&q=85'
WHERE product_id=(SELECT id FROM products WHERE slug='apple-macbook-air-m3')
  AND sort_order IN (0,1);

COMMIT;
