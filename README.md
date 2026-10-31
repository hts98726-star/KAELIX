# KAELIX PULSE

Subscription management for Odoo × Make-A-Ton 9.0 Kochi Hackathon 2026.

## Run locally

Use Node.js 22.13 or later:

```sh
npm install
npm run auth:setup
npx prisma generate
npm run db:setup
npm run dev
```

Open http://localhost:3000. Guests see a welcome page with Login and Create Account. Public registration creates CUSTOMER accounts; successful signup links to login. Accounts retain their sessions after refresh.

- ADMIN → `/admin`: existing dashboard and business management.
- STAFF → `/staff`: operations, checkout, and read-only product catalog.
- CUSTOMER → `/portal`: only their own subscriptions and invoices.

Administrator and staff accounts must be created through the controlled terminal provisioning process in [AUTHENTICATION.md](AUTHENTICATION.md); there are no default privileged credentials.

The connected workflow is product catalog → customer registration → operator checkout → saved subscriptions and draft invoices. Prices are USD and checkout currently uses the billing engine's fixed 10% tax. Checkout creates a draft invoice without collecting a payment. The administrator overview charts and quick-add dialog remain clearly labeled demo data.

`db:setup` initializes the local SQLite database at `prisma/dev.db` and applies the additive schema without resetting existing data. Database files, backups, environment files, and test output are ignored by Git. For another runtime database, `DATABASE_URL` can override the Prisma client's URL; provision that database with the matching schema separately.

## Checks

```sh
npm run lint
npm run build
npm run test:e2e
```

The production build includes TypeScript checks. Playwright uses Microsoft Edge and a fresh temporary SQLite database with test-only accounts and a random session secret. It covers authentication, roles, ownership, server-action permissions, persistence, product/checkout flows, and the existing dashboard features.

Read [AUTHENTICATION.md](AUTHENTICATION.md) for session security, permissions, setup, and backend review notes, and [FRONTEND.md](FRONTEND.md) for UI contracts.
