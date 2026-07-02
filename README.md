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
npm run dev:db
npm run dev
```

Create `server/.env`, `client/.env`, and `admin/.env` from their `.env.example` files before starting the apps. Never commit real environment files.

## Local MongoDB

The API requires MongoDB before it can bind to `http://localhost:8000`. The default local URI is:

```bash
MONGODB_URI=mongodb://localhost:27017/cruisin
```

Recommended local setup:

```bash
npm run dev:db
npm --workspace server run seed
npm run dev
```

If Docker is not available, install and start MongoDB locally with Homebrew:

```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

MongoDB Atlas also works. Replace `MONGODB_URI` in `server/.env` with the Atlas connection string and keep the same `/cruisin` database name or update it intentionally. If MongoDB is down, the API logs a clear connection failure and exits instead of silently running disconnected.

## Verification

```bash
npm run typecheck
npm run lint
npm run build
npm run test
```

## Ports

- Storefront: http://localhost:3000
- Admin: http://localhost:3001
- API: http://localhost:8000
