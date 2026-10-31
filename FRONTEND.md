# KAELIX PULSE frontend integration

The app uses Next.js App Router, TypeScript, Tailwind CSS 4, Radix primitives, and Lucide icons. The dashboard design is preserved while registration, the catalog, checkout, and workspace records are connected to Prisma.

## Routes

- `/`: guest welcome page, or redirect to the authenticated role home.
- `/login`: email/password sign-in with server-side session establishment.
- `/admin`: original demo dashboard (ADMIN only). Charts, metrics, recent subscriptions, CSV export, and its quick-add dialog use synthetic data from `lib/dashboard/mock-data.ts`. Quick-added records reset on navigation or refresh and are never billed.
- `/signup`: standalone account creation UI using `registerUser` from `actions/auth.ts`. Includes confirmation, password guidance, field errors, pending state, duplicate-email handling, and success feedback. It creates a CUSTOMER account and links to login with a success message.
- `/products`: catalog of persisted monthly services and a product creation form backed by `actions/products.ts`.
- `/checkout`: database customer/product selectors, quantities, variant-inclusive prices, estimated totals, pending/error states, and a receipt using the actual saved subscription/invoice returned by `processCheckout`.
- `/customers`, `/subscriptions`, `/invoices`: request-time database views with loading, empty, and unavailable states. Only non-sensitive customer fields are selected.
- `/settings`: administrator-only integration status.
- `/staff`: restricted staff operations.
- `/portal`, `/portal/subscriptions`, `/portal/invoices`: authenticated CUSTOMER views scoped to session ownership.

## Action integration

`registerUser(formData)` accepts `email` and `password`. It returns `success`, `message`, and optional field `errors`. Emails are normalized to lowercase. Passwords are validated with the shared Zod schema, checked against bcrypt's 72-byte input limit, and hashed before persistence.

`processCheckout(userId, cartItems)` accepts a customer UUID and `{ productId, quantity }[]`. Prices and variant markups are loaded from the catalog server-side; client-provided prices are ignored. Quantities must be integers from 1–999, with 1–50 distinct products. Subscription lines and the invoice are saved atomically. Totals are rounded to cents and returned with actual database references. No payment collection occurs.

`createProduct(formData)` creates a monthly service with a name, base price, optional variant name/markup, and optional description. Prices use at most two decimal places. Cost defaults to zero; pricing and full product administration can be extended by the team.

Every business action and data loader enforces server-side permissions. Product creation requires ADMIN; checkout allows ADMIN and STAFF. Customer data access is scoped to the authenticated user. Read AUTHENTICATION.md for the complete permission matrix and controlled privileged account provisioning.

## Components and data

- `components/commerce/*`: signup, checkout, catalog, and workspace presentation.
- `lib/commerce/data.ts`: Prisma queries that never select password hashes.
- `lib/commerce/types.ts`: serializable client contracts.
- `lib/commerce/format.ts`: cent-accurate currency and UTC date display.
- `lib/prisma.ts`: development singleton; optional runtime `DATABASE_URL` override supports isolated tests.
- `components/dashboard/*`: original demo analytics and table interactions.

## Verification

Run `npm install`, `npm run auth:setup`, `npx prisma generate`, and `npm run db:setup` for a local database. Run `npm run lint`, `npm run build`, then `npm run test:e2e`.

The browser suite uses an isolated temporary SQLite database and Microsoft Edge. It verifies database persistence, hashed passwords, duplicate email errors, server-side catalog pricing, tampered-quantity rejection, product creation, demo interactions, and mobile layout. Generated images, traces, and local database files are ignored by Git.
