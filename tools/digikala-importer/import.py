#!/usr/bin/env python3
"""Import public Digikala catalog metadata into local marketplace seed files.

This tool is intentionally designed for a local lab. It does not commit fetched
catalog/review data to Git. Use only endpoints and data that your use of
Digikala permits, keep request rates low, and respect their terms/robots/rate
limits.

Examples:
  python3 import.py --categories mobile-phone,laptop,headphone --pages 3 --limit 150
  python3 import.py --categories mobile-phone,laptop --pages 2 --limit 80 --reviews 5
"""

import argparse
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

BASE = "https://api.digikala.com"
DEFAULT_UA = "NovaMarket-Lab-CatalogImporter/1.0 (local infrastructure lab)"


def get_json(path, params=None, delay=1.0):
    if params:
        path = f"{path}?{urllib.parse.urlencode(params)}"
    url = BASE + path
    req = urllib.request.Request(url, headers={"User-Agent": DEFAULT_UA, "Accept": "application/json"})
    last_error = None
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                body = r.read().decode("utf-8")
                time.sleep(delay)
                return json.loads(body)
        except Exception as exc:
            last_error = exc
            time.sleep(min(8, 2 ** attempt))
    raise RuntimeError(f"GET {url} failed: {last_error}")


def slugify(value):
    value = re.sub(r"[^\w\-\u0600-\u06ff]+", "-", value.lower()).strip("-")
    return value[:160] or "product"


def product_list(category, page):
    data = get_json(f"/v1/categories/{category}/search/", {"page": page})
    return data.get("data", {}).get("products", [])


def product_detail(product_id):
    # v2 is used by the current public integrations we found during research.
    data = get_json(f"/v2/product/{product_id}/")
    return data.get("data", {}).get("product", data.get("data", {}))


def product_comments(product_id, max_reviews):
    comments = []
    try:
        first = get_json(f"/v1/product/{product_id}/comments/")
        payload = first.get("data", {})
        pager = payload.get("pager", {})
        total_pages = min(int(pager.get("total_pages", 1) or 1), 100)
        for page in range(1, total_pages + 1):
            if len(comments) >= max_reviews:
                break
            page_data = first if page == 1 else get_json(
                f"/v1/product/{product_id}/comments/", {"page": page}
            )
            for item in page_data.get("data", {}).get("comments", []):
                body = (item.get("body") or "").strip()
                if not body:
                    continue
                comments.append({
                    "rating": item.get("rate", item.get("rating")),
                    "title": item.get("title", ""),
                    "body": body,
                    "created_at": item.get("created_at"),
                    "is_buyer": item.get("is_buyer"),
                })
                if len(comments) >= max_reviews:
                    break
    except Exception as exc:
        print(f"warning: comments for {product_id}: {exc}", file=sys.stderr)
    return comments[:max_reviews]


def normalize(p, category, reviews):
    pid = p.get("id")
    title = p.get("title_fa") or p.get("title") or p.get("name") or f"Product {pid}"
    price = p.get("selling_price") or p.get("price") or p.get("selling_price_rial") or 0
    old_price = p.get("rrp_price") or p.get("old_price")
    rating = p.get("rating") or p.get("rating_stars") or p.get("star") or 0
    review_count = p.get("rating_count") or p.get("review_count") or 0
    images = p.get("images") or {}
    image = ""
    if isinstance(images, dict):
        image = images.get("main") or images.get("image") or ""
        if isinstance(image, dict):
            image = image.get("url") or image.get("src") or ""
    elif isinstance(images, list) and images:
        first = images[0]
        image = first.get("url", "") if isinstance(first, dict) else str(first)
    return {
        "source": "digikala",
        "external_id": pid,
        "source_category": category,
        "name": title,
        "slug": f"dk-{pid}-{slugify(title)}",
        "brand": p.get("brand", {}).get("title_fa", "") if isinstance(p.get("brand"), dict) else p.get("brand", ""),
        "category": category,
        "price": int(price or 0),
        "old_price": int(old_price or 0) if old_price else None,
        "rating": float(rating or 0),
        "review_count": int(review_count or 0),
        "image": image,
        "source_url": f"https://www.digikala.com/product/dkp-{pid}/" if pid else "",
        "description": p.get("description", "") or "",
        "reviews": reviews,
    }


def sql_quote(value):
    if value is None:
        return "NULL"
    return "'" + str(value).replace("'", "''") + "'"


def write_sql(products, path):
    with path.open("w", encoding="utf-8") as f:
        f.write("""BEGIN;\n\nCREATE TABLE IF NOT EXISTS catalog_sources (\n  id SERIAL PRIMARY KEY,\n  source VARCHAR(40) NOT NULL,\n  external_id BIGINT NOT NULL,\n  source_url TEXT NOT NULL DEFAULT '',\n  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),\n  UNIQUE(source, external_id)\n);\n\nCREATE TABLE IF NOT EXISTS imported_reviews (\n  id BIGSERIAL PRIMARY KEY,\n  source VARCHAR(40) NOT NULL,\n  external_product_id BIGINT NOT NULL,\n  rating NUMERIC(2,1),\n  title TEXT NOT NULL DEFAULT '',\n  body TEXT NOT NULL,\n  created_at TIMESTAMPTZ,\n  is_buyer BOOLEAN,\n  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()\n);\n\n""")
        for p in products:
            if not p.get("external_id"):
                continue
            f.write(
                "INSERT INTO catalog_sources(source, external_id, source_url) VALUES "
                f"({sql_quote(p['source'])}, {int(p['external_id'])}, {sql_quote(p['source_url'])}) "
                "ON CONFLICT (source, external_id) DO UPDATE SET source_url=EXCLUDED.source_url;\n"
            )
            for r in p.get("reviews", []):
                f.write(
                    "INSERT INTO imported_reviews(source, external_product_id, rating, title, body, created_at, is_buyer) VALUES "
                    f"({sql_quote(p['source'])}, {int(p['external_id'])}, {sql_quote(r.get('rating'))}, "
                    f"{sql_quote(r.get('title',''))}, {sql_quote(r.get('body',''))}, {sql_quote(r.get('created_at'))}, {sql_quote(r.get('is_buyer'))});\n"
                )
        f.write("\nCOMMIT;\n")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--categories", default="mobile-phone,laptop,headphone", help="comma-separated category slugs")
    ap.add_argument("--pages", type=int, default=2)
    ap.add_argument("--limit", type=int, default=100)
    ap.add_argument("--reviews", type=int, default=0, help="reviews per product; 0 means do not fetch review text")
    ap.add_argument("--delay", type=float, default=1.0)
    ap.add_argument("--out", default="data/local/digikala")
    args = ap.parse_args()

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    products = []
    seen = set()

    for category in [x.strip() for x in args.categories.split(",") if x.strip()]:
        for page in range(1, args.pages + 1):
            if len(products) >= args.limit:
                break
            try:
                items = product_list(category, page)
            except Exception as exc:
                print(f"warning: category {category} page {page}: {exc}", file=sys.stderr)
                continue
            for item in items:
                pid = item.get("id")
                if not pid or pid in seen or len(products) >= args.limit:
                    continue
                seen.add(pid)
                try:
                    detail = product_detail(pid)
                except Exception as exc:
                    print(f"warning: product {pid}: {exc}", file=sys.stderr)
                    detail = item
                reviews = product_comments(pid, args.reviews) if args.reviews else []
                products.append(normalize({**item, **detail}, category, reviews))
                print(f"imported {len(products)}/{args.limit}: {pid} {products[-1]['name']}")

    json_path = out / "products.json"
    json_path.write_text(json.dumps(products, ensure_ascii=False, indent=2), encoding="utf-8")
    write_sql(products, out / "import.sql")
    print(f"\nDone: {len(products)} products")
    print(f"JSON: {json_path}")
    print(f"SQL : {out / 'import.sql'}")


if __name__ == "__main__":
    main()
