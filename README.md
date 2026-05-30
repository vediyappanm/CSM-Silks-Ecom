# CSM Silks - Production Retailer V1

Single-brand textile ecommerce platform for CSM Silks, rebuilt around a Django/DRF API and the existing React/Vite storefront.

## Quick Start

```bash
python backend/manage.py migrate
python backend/manage.py seed_csm
python backend/manage.py runserver 0.0.0.0:8000

cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173` and proxies `/api` to Django on `http://localhost:8000`.

## Core Accounts

- Admin: `admin@csmsilks.com` / `admin123`
- Customer OTP phone: `+918888888888`
- In development, `/api/auth/otp/send` returns `dev_otp`.

## Backend

- Django project: `backend/csm_backend`
- Apps: accounts, catalog, inventory, cart, orders, payments, shipping, loyalty, reviews, notifications, analytics, ai
- API docs: `GET /api/docs`
- Health: `GET /health` or `GET /api/health`

## Key API Routes

- Customer: `/api/products`, `/api/search`, `/api/cart`, `/api/checkout/summary`, `/api/orders`, `/api/orders/track`, `/api/orders/{id}/invoice`, `/api/addresses`
- Auth: `/api/auth/otp/send`, `/api/auth/otp/verify`, `/api/auth/admin/login`, `/api/auth/me`
- Payments: `/api/payments/razorpay/order`, `/api/payments/razorpay/verify`, `/api/payments/webhook`
- Admin: `/api/admin/dashboard`, `/api/admin/products`, `/api/admin/variants`, `/api/admin/inventory`, `/api/admin/orders`, `/api/admin/orders/{id}/workflow`, `/api/admin/shipments/{id}/label`

## Fulfillment V1

- Admin can move orders through quality check, packing, label creation, pickup, in transit, out for delivery, delivery failed, RTO, delivered.
- Manual courier labels and manifests are downloadable from the admin API.
- Customer tracking works by login order detail or public order/AWB + phone lookup.
- Shiprocket credentials are represented in `.env.example`; live Shiprocket API calls should replace the manual label adapter when credentials are available.

## Validation

```bash
python backend/manage.py check
python backend/manage.py test accounts catalog cart orders payments inventory loyalty notifications analytics shipping reviews ai
cd frontend && npm run build
```
