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

- Customer: `/api/products`, `/api/search`, `/api/cart`, `/api/checkout/summary`, `/api/orders`, `/api/addresses`
- Auth: `/api/auth/otp/send`, `/api/auth/otp/verify`, `/api/auth/admin/login`, `/api/auth/me`
- Payments: `/api/payments/razorpay/order`, `/api/payments/razorpay/verify`, `/api/payments/webhook`
- Admin: `/api/admin/dashboard`, `/api/admin/products`, `/api/admin/variants`, `/api/admin/inventory`, `/api/admin/orders`

## Validation

```bash
python backend/manage.py check
python backend/manage.py test accounts catalog cart orders payments inventory loyalty notifications analytics shipping reviews ai
cd frontend && npm run build
```
