<!-- Governed by .rules v1.0 -->

# Cruisin Luxury Ecommerce Platform

Cruisin is a dark-mode-only luxury streetwear commerce platform with a Next.js storefront, a Next.js admin CMS dashboard, and a Node/Express API. The project follows .rules v1.0 as its source of truth.

## Apps

- client/: customer storefront, editorial homepage, shop, PDP, cart, checkout, auth, account.
- admin/: admin dashboard, KPI overview, product management, order/user/category/discount tables, CMS builder, analytics.
- server/: Express 5 API under /api/v1, MongoDB models, Redis refresh-token storage, payments, Cloudinary signing, email, security middleware.

## Quick Start

```bash
npm install
npm run dev
```

Create server/.env from server/.env.example before starting the API. Never commit real environment files.

## Verification

```bash
npm run typecheck
npm run build
```

## Ports

- Storefront: http://localhost:3000
- Admin: http://localhost:3001
- API: http://localhost:8000
