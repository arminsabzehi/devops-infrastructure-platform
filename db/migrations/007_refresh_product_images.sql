-- Refresh catalog image URLs after the original MinIO objects were lost.
-- Keep images as externally hosted URLs; no MinIO credentials or buckets are touched.
BEGIN;

WITH image_map(slug, image_url) AS (
  VALUES
  ('nova-x-headphones','https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=85'),
  ('aero-pro-watch','https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=900&q=85'),
  ('urban-runner','https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=85'),
  ('city-pack','https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=85'),
  ('milano-sunglasses','https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=900&q=85'),
  ('pulse-speaker','https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=900&q=85'),
  ('samsung-galaxy-a56-5g','https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=85'),
  ('apple-iphone-16','https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?auto=format&fit=crop&w=900&q=85'),
  ('xiaomi-redmi-note-14-pro','https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=900&q=85'),
  ('samsung-galaxy-s25-ultra','https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=900&q=85'),
  ('lenovo-ideapad-slim-3','https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=85'),
  ('lenovo-loq-gaming','https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=900&q=85'),
  ('apple-macbook-air-m3','https://images.unsplash.com/photo-1504198070170-4ca53bb1c1fa?auto=format&fit=crop&w=900&q=85'),
  ('sony-wh-1000xm5','https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=85'),
  ('apple-airpods-pro-2','https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?auto=format&fit=crop&w=900&q=85'),
  ('jbl-tune-770nc','https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=900&q=85'),
  ('apple-watch-series-10','https://images.unsplash.com/photo-1551816230-ef5deaed4a26?auto=format&fit=crop&w=900&q=85'),
  ('samsung-galaxy-watch-7','https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=85'),
  ('xiaomi-watch-2','https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=900&q=85'),
  ('lg-oled-55','https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=900&q=85'),
  ('samsung-qled-55','https://images.unsplash.com/photo-1593784991095-a205069470b6?auto=format&fit=crop&w=900&q=85'),
  ('xiaomi-tv-a-pro-55','https://images.unsplash.com/photo-1601944177325-f8867652837f?auto=format&fit=crop&w=900&q=85'),
  ('playstation-5-slim','https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=900&q=85'),
  ('xbox-series-x','https://images.unsplash.com/photo-1621259182978-fbf93132d53d?auto=format&fit=crop&w=900&q=85'),
  ('sony-dualsense','https://images.unsplash.com/photo-1592840496694-26c035b52b8c?auto=format&fit=crop&w=900&q=85'),
  ('xiaomi-robot-vacuum-s20','https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=900&q=85'),
  ('philips-coffee-series-2200','https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=900&q=85'),
  ('philips-airfryer','https://images.unsplash.com/photo-1585515320310-259814833e62?auto=format&fit=crop&w=900&q=85'),
  ('nike-air-max','https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=85'),
  ('adidas-runfalcon','https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=85'),
  ('city-pack-pro','https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=85'),
  ('milano-classic','https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=900&q=85'),
  ('jbl-charge-5','https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=900&q=85'),
  ('sony-srs-xb100','https://images.unsplash.com/photo-1589256469067-ea99122bbdc4?auto=format&fit=crop&w=900&q=85'),
  ('lg-ultragear-27','https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=900&q=85'),
  ('samsung-tab-s9-fe','https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=900&q=85')
),
updated_products AS (
  UPDATE products p
  SET image = m.image_url
  FROM image_map m
  WHERE p.slug = m.slug
  RETURNING p.id, p.image
)
UPDATE product_images pi
SET url = up.image
FROM updated_products up
WHERE pi.product_id = up.id;

-- Also create a primary gallery image for any mapped product missing one.
INSERT INTO product_images(product_id, url, sort_order)
SELECT p.id, p.image, 0
FROM products p
JOIN image_map m ON m.slug = p.slug
WHERE NOT EXISTS (
  SELECT 1 FROM product_images pi
  WHERE pi.product_id = p.id AND pi.sort_order = 0
);

COMMIT;
