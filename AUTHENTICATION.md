# Authentication and access control

## Root cause and entry behavior

The old `app/page.tsx` unconditionally rendered the demo administrator dashboard, and the root layout wrapped every page in the administrator sidebar. Signup only inserted a User row; there was no session verification or authorization in the page loaders or mutation actions.

The root layout is now public. `/` renders the branded welcome experience for guests and redirects authenticated users by their current database role. `/login` verifies credentials; `/signup` creates CUSTOMER accounts and links to login with a success message. The original dashboard is preserved at `/admin`, including its filtering, sorting, pagination, CSV export, charts, and temporary demo quick-add form.

## Role permissions

| Function | ADMIN | STAFF | CUSTOMER |
| --- | --- | --- | --- |
| Home after login | `/admin` | `/staff` | `/portal` |
| Administrator analytics and settings | Yes | No | No |
| Customer list and operational subscriptions/invoices | Yes | Yes | No |
| Product catalog read | Yes | Yes | No |
| Create catalog products | Yes | No | No |
| Checkout for workspace customers | Yes | Yes | No |
| Customer portal and own records | No | No | Own records only |

Staff can read products and operate checkout, subscriptions, invoices, and customer records, but cannot create products or enter administrator settings/analytics. Customers cannot choose another customer or invoke operator checkout. Product pricing continues to come from the database and checkout remains transactional.

`app/(workspace)/layout.tsx` checks the session before rendering the role-aware sidebar. Every protected page independently checks allowed roles. `lib/commerce/data.ts` checks authorization before querying, and customer loaders take ownership from the server session rather than a caller-provided user ID. `actions/products.ts` requires ADMIN; `actions/checkout.ts` requires ADMIN or STAFF. There is no client-side role override.

## Sessions and credentials

- Session library: [iron-session 9](https://github.com/vvo/iron-session), using its Next.js cookie adapter. Requires Node.js 22.13 or later.
- Persistent sessions expire after eight hours. The encrypted cookie contains only a random 256-bit token; SQLite stores its SHA-256 digest in `AuthSession`.
- The cookie is HTTP-only, host-only, SameSite=Lax, Path=/, and Secure in production. Local development uses HTTP; deployed production must use HTTPS.
- Each request checks the database session expiry and current User role. Roles are not trusted from cookies or localStorage. Session reads are request-time and React memoization is limited to the current request.
- Login rotates the browser's existing session. Logout deletes the database row and clears the cookie, so a copied old cookie cannot authenticate afterward. Expired sessions are removed during subsequent login activity.
- `SESSION_SECRET` must contain at least 32 characters. `npm run auth:setup` generates a random secret in ignored `.env` without printing it or replacing an existing setting. Set an independently generated secret through the deployment's server-side environment configuration. Never prefix it with NEXT_PUBLIC.
- Passwords remain bcrypt hashes. Public signup always sets CUSTOMER, requires more than eight characters plus uppercase/lowercase/special characters, and rejects more than 72 UTF-8 bytes. Existing eight-character passwords can still log in; the stricter rule applies to new accounts.
- Email lookup is parameterized and case-insensitive for legacy mixed-case records without rewriting data. Ambiguous legacy duplicates fail closed and require an administrator to resolve them manually. New addresses are normalized before insertion and the database unique constraint remains enforced.
- Invalid login responses are generic. Failed sign-ins use a database-backed limit of ten attempts per normalized email in a fixed 15-minute window; a successful sign-in clears that account's current window. This is an account limit, not a substitute for deployment-level distributed/IP abuse controls.
- Login and logout are POST-only Next.js Server Actions, which enforce the framework's origin/host checks. No state-changing GET endpoint was introduced.

## Protected read APIs

`GET /api/auth/session` returns only the signed-in user's ID, email, and role. `/api/subscriptions` and `/api/invoices` return all operational records to ADMIN/STAFF and only owned records to CUSTOMER. Their `/[id]` detail routes apply the same ownership filter; another customer's record returns 404. Query-string user IDs do not change ownership. Unauthenticated calls return 401. Responses use `Cache-Control: private, no-store`.

## Setup and account provisioning

```sh
npm install
npm run auth:setup
npx prisma generate
npm run db:setup
npm run dev
```

The schema adds only `AuthSession`, `AuthAttempt`, and the User-to-session relation. Existing users, products, subscriptions, lines, invoices, and payments are retained. A local SQLite backup was taken before applying the schema; backups and database files are ignored by Git. Use the team's normal migration procedure and an appropriate backup for deployed databases.

There are no seeded administrator passwords in the application. Public signup cannot create ADMIN or STAFF. An authorized operator with terminal/database access can provision a new privileged account through the controlled CLI. For PowerShell 7:

```powershell
$env:KAELIX_PROVISION_PASSWORD = Read-Host -Prompt "New account password" -MaskInput
node scripts/provision-user.mjs --email admin@your-company.example --role ADMIN
$env:KAELIX_PROVISION_PASSWORD = $null
```

Use `--role STAFF` for a staff account. Passwords are not accepted as command-line arguments. The CLI validates and hashes the password, refuses existing emails, and never prints a password. It does not promote or overwrite an existing account. Keep privileged account provisioning restricted to trusted operators.

## Verification and backend review

The browser suite uses an isolated temporary SQLite database and a random test-only session secret; it never modifies the development database. Tests cover guest entry, signup validation/duplicate emails and role injection, role redirects, session restoration and cookie flags, unauthorized page/API access, cross-customer ownership, logout replay rejection, expired sessions, database role changes, forged cookies, action permission enforcement, legacy accounts, login throttling, and the existing product/checkout/dashboard behaviors.

Run `npm run lint`, `npm run build` (includes TypeScript), and `npm run test:e2e`. Review the server output as well as test results; session verification must not be prefetched as shared data.

Backend reviewers should focus on the additive Prisma schema, `lib/auth/*`, protected API ownership filters, action guards, STAFF permission scope, and deployment secret/HTTPS/database migration setup. Odoo/payment collection and live overview analytics remain separate from this authentication change.

## Validated delivery

Production build and standalone TypeScript passed. ESLint passed without warnings. All 27 Playwright tests passed; no prerender/session verification errors appeared in the final server log. The existing business-row counts and SQLite integrity were verified after the additive schema update.

## Changed file inventory

The following inventory is relative to the existing frontend integration commit. `R` entries preserve the original page at its protected route-group location.

```text
M	.gitignore
A	AUTHENTICATION.md
M	FRONTEND.md
M	README.md
M	actions/auth.ts
M	actions/checkout.ts
M	actions/products.ts
A	actions/session.ts
A	app/(workspace)/admin/page.tsx
R086	app/checkout/page.tsx	app/(workspace)/checkout/page.tsx
R093	app/customers/page.tsx	app/(workspace)/customers/page.tsx
R093	app/invoices/page.tsx	app/(workspace)/invoices/page.tsx
A	app/(workspace)/layout.tsx
A	app/(workspace)/portal/invoices/page.tsx
A	app/(workspace)/portal/page.tsx
A	app/(workspace)/portal/subscriptions/page.tsx
R071	app/products/page.tsx	app/(workspace)/products/page.tsx
R091	app/settings/page.tsx	app/(workspace)/settings/page.tsx
A	app/(workspace)/staff/page.tsx
R094	app/subscriptions/page.tsx	app/(workspace)/subscriptions/page.tsx
A	app/access-denied/page.tsx
A	app/api/auth/session/route.ts
A	app/api/invoices/[id]/route.ts
A	app/api/invoices/route.ts
A	app/api/subscriptions/[id]/route.ts
A	app/api/subscriptions/route.ts
M	app/layout.tsx
A	app/login/page.tsx
M	app/page.tsx
M	app/signup/page.tsx
A	components/auth/login-form.tsx
A	components/auth/portal-records.tsx
A	components/auth/role-gate.tsx
M	components/commerce/product-catalog.tsx
M	components/commerce/signup-form.tsx
M	components/dashboard/app-shell.tsx
A	lib/auth/authorize.ts
A	lib/auth/roles.ts
A	lib/auth/session.ts
A	lib/auth/throttle.ts
A	lib/auth/users.ts
M	lib/commerce/data.ts
M	lib/validations.ts
M	package-lock.json
M	package.json
M	playwright.config.ts
M	prisma/schema.prisma
A	scripts/provision-user.mjs
A	scripts/setup-auth.mjs
A	tests/auth.spec.ts
M	tests/commerce.spec.ts
M	tests/dashboard.spec.ts
M	tests/global-setup.ts
A	tests/helpers/auth.ts
```
