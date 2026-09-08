# NovaMarket — DevOps Infrastructure Platform

> A practical ecommerce and infrastructure lab project built to practice containerization, Kubernetes deployment, private-registry workflows, persistent storage, and object-storage integration in a restricted/offline environment.

## فارسی

### معرفی

**NovaMarket** یک پروژه عملی فروشگاهی است که در کنار توسعه نرم‌افزار، برای تمرین و نمایش مفاهیم زیرساخت و DevOps ساخته شده است.

تمرکز پروژه روی یک سناریوی واقعی و قابل اجرا در یک لابراتوار خصوصی است؛ بنابراین در این مستندات فقط قابلیت‌هایی نوشته شده‌اند که در وضعیت فعلی پروژه واقعاً پیاده‌سازی یا تست شده‌اند.

### وضعیت فعلی

- اپلیکیشن فروشگاهی با API و رابط وب
- کاتالوگ شامل ۳۶ محصول نمونه
- PostgreSQL 16 برای داده‌های برنامه
- اجرای سرویس‌ها به‌صورت کانتینری
- استقرار فعلی روی Kubernetes
- تفکیک سرویس‌های کاربردی به Deploymentهای مستقل در Kubernetes
- استفاده از private container registry در محیط محدود/آفلاین
- استفاده از MinIO برای نگهداری فایل و تصاویر محصولات
- نگهداری **Object Key** تصویر در PostgreSQL به‌جای ذخیره فایل در دیتابیس
- تولید Presigned URL توسط سرویس Catalog برای دسترسی به تصاویر MinIO
- امکان تعویض تصویر بدون migration، build یا redeploy برنامه
- Nginx Gateway برای routing داخلی سرویس‌ها

### معماری فعلی تصاویر

```text
Browser
   |
   v
Nginx Gateway
   |
   v
Catalog API
   |
   +------> PostgreSQL
   |          image = products/25/main.jpg
   |
   +------> MinIO
              novamarket/products/25/main.jpg
                     |
                     v
              Presigned GET URL
                     |
                     v
                  Browser
```

در این مدل، PostgreSQL فقط اطلاعات و Object Key را نگه می‌دارد. فایل واقعی در MinIO قرار دارد. بنابراین برای تغییر تصویر یک محصول، فایل جدید می‌تواند جایگزین Object قبلی شود و نیازی به ساخت image جدید یا اجرای migration دیتابیس نیست.

### نکته درباره تصاویر فعلی

تصاویر نمونه محصولات از URLهای موجود در داده‌های پروژه تهیه شده‌اند. در زمان انتقال به MinIO، ۳۵ تصویر با موفقیت منتقل شدند و تصویر محصول ۲۵ نیز بعداً با یک تصویر معتبر جایگزین شد. تصاویر اصلی و تصاویر مرتبط با صفحه جزئیات محصول ۲۵ نیز اصلاح شده‌اند.

### ساختار Repository

```text
.
├── app/ / services/       # Application source (depending on service)
├── db/
│   └── migrations/        # PostgreSQL schema and seed migrations
├── Dockerfile*            # Container build definitions
├── k8s/                   # Kubernetes-related files kept with the app where applicable
└── README.md
```

> Kubernetes deployment manifests are maintained primarily in the companion repository: `arminsabzehi/devops-infrastructure-platform-k8s`.

### Database migrations

Migrations are used for **schema and initial/controlled data changes**, not for routine image replacement.

Current catalog-related migrations include:

- `000_init.sql`
- `002_marketplace.sql`
- `003_catalog_seed.sql` — idempotent catalog seed
- `004_product_details.sql`
- `005_fix_macbook_image.sql`
- `006_fix_dualsense_image.sql`

The catalog seed is intentionally idempotent so that re-running the migration does not create duplicate products.

### Container Registry

The project is designed to work with a private registry in the lab environment. Images are built locally and pushed to the private registry before Kubernetes deployment.

No public cloud dependency is assumed for the current lab deployment.

### What this project demonstrates

This repository is primarily a hands-on learning/portfolio project. It demonstrates practical work with:

- Docker and containerized services
- PostgreSQL
- REST APIs
- Nginx-based service routing
- Kubernetes deployment concepts
- Kustomize-based configuration
- Persistent storage concepts
- Private container registries
- MinIO / S3-compatible object storage
- Presigned URLs
- Database migrations and idempotent seed data
- Operation in a restricted/offline lab environment

It is **not** presented as a claim of production-scale cloud architecture or as a replacement for managed cloud services.

---

## English

### Overview

**NovaMarket** is a practical ecommerce lab used to develop and demonstrate infrastructure and DevOps skills through a real, deployable application.

The project is intentionally built around a private/restricted lab environment. This README describes the capabilities that are actually implemented and tested rather than listing technologies only as planned features.

### Current status

- Ecommerce application with web frontend and APIs
- 36 sample catalog products
- PostgreSQL 16 for application data
- Containerized application services
- Current deployment on Kubernetes
- Application services split into independent Kubernetes Deployments
- Private container registry for the restricted/offline lab
- MinIO used as object storage for product images/files
- PostgreSQL stores image **Object Keys**, not the image binaries
- Catalog generates Presigned URLs for MinIO-backed images
- Product images can be replaced without a database migration, application rebuild, or Kubernetes redeployment
- Nginx Gateway handles internal application routing

### Current image-storage architecture

```text
Browser
   |
   v
Nginx Gateway
   |
   v
Catalog API
   |
   +------> PostgreSQL
   |          image = products/25/main.jpg
   |
   +------> MinIO
              novamarket/products/25/main.jpg
                     |
                     v
              Presigned GET URL
                     |
                     v
                  Browser
```

PostgreSQL stores the object key while MinIO stores the actual file. The Catalog service resolves object keys into temporary Presigned URLs. This keeps binary files outside the database and makes image replacement an operational storage task rather than a code/database migration task.

### Repository layout

```text
.
├── app/ / services/       # Application source (depending on service)
├── db/
│   └── migrations/        # PostgreSQL schema and seed migrations
├── Dockerfile*            # Container build definitions
├── k8s/                   # Kubernetes-related files kept with the app where applicable
└── README.md
```

> The main Kubernetes deployment manifests are maintained in the companion repository: `arminsabzehi/devops-infrastructure-platform-k8s`.

### Database migrations

Migrations are used for database schema and controlled initial data changes. Routine image replacement does not require a new migration.

Current catalog-related migrations include:

- `000_init.sql`
- `002_marketplace.sql`
- `003_catalog_seed.sql` — idempotent catalog seed
- `004_product_details.sql`
- `005_fix_macbook_image.sql`
- `006_fix_dualsense_image.sql`

### Private/offline deployment model

The project is intended to work in a restricted infrastructure lab where container images are prepared locally and pushed to a private registry before Kubernetes deployment.

The current setup does not depend on a public cloud provider for its runtime environment.

### Skills and technologies actually exercised

- Docker and containerized application services
- PostgreSQL
- REST APIs
- Nginx routing
- Kubernetes
- Kustomize
- Persistent storage concepts
- Private container registry workflows
- MinIO / S3-compatible object storage
- Presigned URLs
- PostgreSQL migrations and idempotent seed data
- Restricted/offline infrastructure workflows

This repository is a practical learning and portfolio project. It intentionally avoids claiming production-scale cloud architecture, managed Kubernetes, or other capabilities that are not part of the current implementation.

---

## Related repository

Kubernetes manifests and lab deployment configuration:

`arminsabzehi/devops-infrastructure-platform-k8s`
