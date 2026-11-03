# NovaMarket product images

The importer copies product photographs into the project's own MinIO bucket. The website then serves the stored objects through the catalog service's existing MinIO URL resolver; browsers no longer need to contact an external image CDN.

## Image sources and limitations

The manifest `product-image-sources.json` maps product slugs to Pexels photo IDs. These are representative stock photographs, not manufacturer-authenticated images of the exact model named in each product title. Review the downloaded files before importing them if exact product identity matters.

Pexels license information: https://www.pexels.com/license/

## Safe two-stage workflow

Run from `services/catalog` in a checkout of this repository:

1. Install the catalog dependencies with `npm install`.
2. Download and validate all source images without changing MinIO or PostgreSQL:

   ```bash
   npm run images:download
   ```

   The files are cached in `assets/product-images/`. If a Pexels image is unavailable or the network blocks it, the script stops before uploading anything or changing the database.
3. Inspect the images in `assets/product-images/`.
4. Set the environment variables below, then run `npm run images:import`.

Required environment:
- `DATABASE_URL` — catalog PostgreSQL connection string
- `S3_ENDPOINT` — MinIO endpoint as `host:port`
- `S3_USE_SSL` — `true` or `false`
- `S3_BUCKET` — existing `novamarket` bucket
- `S3_ACCESS_KEY` and `S3_SECRET_KEY` — MinIO credentials

The importer verifies that all 36 product slugs exist and that the bucket exists before uploading. It uploads deterministic keys under `products/<product-id>/main.jpg`, then updates `products.image` and the corresponding `product_images.url` rows in one PostgreSQL transaction. It does not access or modify any backup bucket.

The script is safe to rerun: it overwrites only these product-image keys in the `novamarket` bucket and reapplies the same database references.
