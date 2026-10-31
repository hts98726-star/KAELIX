# KAELIX PULSE

Subscription management workspace for Odoo × Make-A-Ton 9.0 Kochi Hackathon 2026.

## Local setup

Use Node.js 22 or later. From `KAELIX-integrated`:

```sh
npm install
npx prisma generate
npm run db:setup
npm run dev
```

Open http://localhost:3000. `db:setup` initializes the local SQLite database at `prisma/dev.db` from the team's schema. It does not reset an existing database. Database files are ignored by Git. Pull changes on your feature branch and keep all UI and Prisma dependencies when resolving package conflicts.

## Connected workflow

1. Open **Create account** (`/signup`) to register a customer. Passwords are validated and hashed with bcrypt.
2. Open **Products** (`/products`) to add monthly services and optional variant markups. Prices are in USD.
3. Open **Checkout** (`/checkout`), choose a customer and products, and set quantities.
4. Submit to create an active monthly subscription and a draft invoice in one database transaction. Checkout looks up catalog prices on the server.
5. **Customers**, **Subscriptions**, and **Invoices** show actual saved records and remain populated after refresh.

Checkout creates a draft invoice; it does not charge a card or mark an invoice paid. The billing engine currently applies a fixed 10% tax. The overview dashboard (`/`) still uses clearly labeled sample analytics and a temporary demo quick-add form.

This is an internal development workspace. Registration does not create a login session, and workspace routes/actions do not yet enforce user roles. Session authentication and authorization are required before public deployment. The sample admin profile does not represent an authenticated user.

## Validation

```sh
npm run lint
npm run build
npm run test:e2e
```

Playwright runs against the production build using Microsoft Edge. Each test run creates a fresh SQLite database in the system temporary directory; tests never use the development database. The suite covers demo dashboard interactions, signup validation and duplicate accounts, password hashing, checkout pricing and tampering, persistence, product creation, and mobile layout. Screenshots and traces are generated under ignored `artifacts/` and `test-results/` directories.

For another runtime database, `DATABASE_URL` may override the Prisma client's connection URL. Provision that database with a matching schema separately; `db:setup` targets the repository's local SQLite database.

See [FRONTEND.md](FRONTEND.md) for UI contracts and the remaining demo data boundary.
