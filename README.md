# KAELIX PULSE

**One place to run plans, subscriptions, and recurring billing.**
Built for the Odoo × Make-A-Ton 9.0 Kochi Hackathon 2026 ("Subscription Management System").

KAELIX PULSE follows a subscription business — the problem statement's *Brightloop Software* — through a full billing month: customers sign up, the admin launches products and plans, sales turns a quotation template into a subscription, billing day creates every invoice automatically, discounts and taxes apply themselves, payments are recorded against the right invoice, and the finance lead sees active subscriptions, revenue, outstanding and overdue balances in one dashboard.

---

## Getting started after cloning (step by step)

> You need **Node.js 22.13 or later** and **Git**. Commands are for Windows PowerShell. If PowerShell says *"running scripts is disabled"*, keep using `npm.cmd` / `npx.cmd` exactly as written. On macOS or Linux, use `npm` / `npx`.

**1. Clone the project and open the folder**

```powershell
git clone https://github.com/hts98726-star/KAELIX.git
cd KAELIX
```

**2. Install the packages**

```powershell
npm.cmd install
```

**3. Create the session secret** (writes a random `SESSION_SECRET` into `.env`; it is never printed)

```powershell
npm.cmd run auth:setup
```

**4. Create the database**

```powershell
npx.cmd prisma generate
npm.cmd run db:setup
```

**5. Load the demo data and set the demo customer password**

```powershell
$env:KAELIX_DEMO_PASSWORD="<demo customer password>"; npm.cmd run db:seed-demo
```

This adds 24 customers, 6 products, 7 plans, taxes, discounts, quotation templates, 24 subscriptions, about 90 invoices, and about 80 payments. It runs only once and never deletes anything.

**6. Create your admin account** (the project ships with no default admin password)

```powershell
$env:KAELIX_PROVISION_PASSWORD="<admin password>"; npm.cmd run auth:provision -- --email admin@kaelix.test --role ADMIN
```

Passwords must be longer than 8 characters and include an uppercase letter, a lowercase letter, and a special character.

**7. Start the website**

```powershell
npm.cmd run dev
```

Keep this terminal open while you use the site.

**8. Open it in your browser**

- On this computer: **http://localhost:3000**
- From a phone or laptop on the same Wi-Fi: **http://\<your computer's IP\>:3000** (shown as *Network* when the server starts)

**9. Log in and check it works**

| Role | Email | Password | Opens |
| --- | --- | --- | --- |
| **Admin** | `admin@kaelix.test` | ________________ *(the password from step 6)* | `/admin`: live dashboard, billing, reports, configuration |
| **Customer** | `olivia.rhye@demo.brightloop.test` | ________________ *(the password from step 5)* | `/portal`: only Olivia's own subscription and invoices |
| **Staff** | *(create one as admin: Settings → Team)* | ________________ *(set when you create it)* | `/staff`: day-to-day operations |

Any other demo customer works with the same password: `phoenix.baker@…`, `drew.cano@…`, `natali.craig@…`, and so on, all ending in `@demo.brightloop.test`.

**10. Try the main flow** (as admin)

1. **Dashboard**: live metrics, revenue chart, plan mix, recent subscriptions.
2. **Subscriptions → New subscription** → template *Enterprise ERP rollout* → **Save quotation** → **Confirm** → **Start subscription**.
3. **Invoices → Run billing now** (run it twice: nothing is billed twice).
4. Open a draft invoice → **Confirm invoice** → **Record payment** → **Paid** → **Print**.
5. **Reports**, **Configuration**, and **Settings → Team**.

To log out, click your initials (top right) → **Log out**.

**Troubleshooting**

| Problem | Fix |
| --- | --- |
| *"running scripts is disabled"* | Use `npm.cmd` / `npx.cmd` instead of `npm` / `npx`. |
| *"Port 3000 is in use"* / *"Another next dev server is already running"* | The site is already running; open http://localhost:3000. To restart it, stop the old process with `taskkill /PID <pid shown> /F`, then run step 7 again. |
| *"Workspace data is unavailable"* | Stop the server, run `npx.cmd prisma generate` and `npm.cmd run db:setup`, then start it again. |
| Seed says *"Demo data is already present"* | Expected: it adds data only once. Re-running it with `KAELIX_DEMO_PASSWORD` set only changes the demo customers' password. |
| Forgot a password | Use **Forgot your password?** on the login page. In development, the reset link prints in the terminal running the server. |

> Each teammate has their own local database. `git pull` shares code, not data. After pulling, run `npx.cmd prisma generate` and `npm.cmd run db:setup` (with the server stopped).

---

## Features

| Area | What works |
| --- | --- |
| **Accounts & roles** | Signup (unique email; password > 8 chars with upper, lower, special), login with persistent database-backed sessions, logout, login throttling. Roles **ADMIN**, **STAFF**, **CUSTOMER**, enforced on the server for every page, API, and action. |
| **Password reset** | "Forgot your password?" sends a single-use link (hashed token, 30-minute expiry). Resetting signs the account out everywhere. |
| **Staff management** | Only an admin can add staff (Settings → Team). Existing accounts are never changed or promoted. |
| **Products & variants** | Name, type, sales price, cost price, notes, tax rule. Variants such as *Brand: Odoo → +$560*. Edit and archive without changing past prices. |
| **Recurring plans** | Price per period, billing period (daily / weekly / monthly / yearly), minimum quantity, availability dates, and per-plan rules: closes automatically, closable early, pausable, renewable. |
| **Quotation templates** | Prefilled plan, quantity, add-on lines, payment terms, and a validity period in days. |
| **Subscriptions** | Own number (`SUB-00001`), customer, plan, start and expiry dates, payment terms, lines with product, quantity, unit price, and tax. Lifecycle **Draft → Quotation → Confirmed → Active ⇄ Paused → Closed**, plus Renew, gated by the plan's rules. |
| **Billing day** | **Run billing now** creates one draft invoice for every due period of every active subscription, with customer, lines, taxes, discounts, and totals filled in. Missed periods are caught up. A database constraint plus compare-and-set means a period is **never billed twice**. Ended auto-close plans are closed. |
| **Taxes** | Admin-defined tax rules with a default; the rate is saved on each subscription line. |
| **Discounts** | Admin-only rules: fixed or percentage, minimum quantity or purchase, start and end dates, usage limit, scoped to one product or the whole subscription. Applied automatically to the next invoice; they stop when expired or used up. |
| **Invoices** | **Draft → Confirmed → Paid** (or Cancelled). Confirm assigns `INV/YYYY/NNNNN` and a due date from payment terms. Send, print or save as PDF, cancel. |
| **Payments** | Record method, amount, date, and note against an invoice. Partial payments are supported, and over-payment is rejected. The invoice becomes Paid when settled. |
| **Overdue** | A confirmed invoice is **overdue** the day after its due date. Filter, report, and dashboard counts use this rule. |
| **Dashboard** | Live from the database: active subscriptions, revenue collected, outstanding, overdue; 3/6/12-month collected-vs-invoiced chart; subscriptions by plan; latest 100 subscriptions with search, filter, sort, pagination, CSV export. |
| **Reports** | Any date range: MRR/ARR, active, paused, started, and closed counts, invoiced (with tax and discounts), collected by payment method, outstanding, overdue list, payments list. |
| **Customer portal** | Customers see only their own subscriptions and confirmed invoices (balance, due date, overdue flag) and can print them. |
| **Performance** | Server-side filtering and pagination (25 per page), database aggregates, and indexes on status, dates, and foreign keys, so pages stay fast with thousands of records. |

---

## Tech stack

Next.js 16.4 (App Router, Server Actions, Cache Components) · React 19 · TypeScript · Tailwind CSS 4 · Radix UI · Lucide · Prisma 5 + SQLite · iron-session 9 · bcryptjs · Zod · Playwright (Microsoft Edge).

---

## More setup options

- **Add staff from the terminal:** `$env:KAELIX_PROVISION_PASSWORD="<password>"; npm.cmd run auth:provision -- --email staff@yourco.test --role STAFF`
- **Another database:** set `DATABASE_URL` (the provider stays SQLite) and provision it with the same schema.

---

## Five-minute demo script

| # | As | Do |
|---|---|---|
| 1 | Guest | `/signup`: try a weak password and a duplicate email; then **Forgot your password?** (in development the reset link prints in the server terminal). |
| 2 | Admin | **Dashboard**: live metrics, revenue chart, plan mix, recent subscriptions (search, filter, export). |
| 3 | Admin | **Products** → *Brightloop ERP Suite*: variant **Brand: Odoo +$560**. **Plans**: billing periods and lifecycle rules. |
| 4 | Admin | **Subscriptions → New subscription** → template *Enterprise ERP rollout* → **Save quotation** → **Confirm** → **Start subscription** (first invoice created; the 10-seat volume discount applies automatically). |
| 5 | Admin | **Invoices → Run billing now**. Run it again: no duplicates. |
| 6 | Admin | Open a draft invoice → **Confirm invoice** → **Record payment** (partial, then the rest) → **Paid** → **Print**. |
| 7 | Admin | **Invoices → Overdue**, then **Reports** (This month / Last 3 months). |
| 8 | Admin | **Configuration**: create a tax rule or discount. **Settings → Team**: add a staff member. |
| 9 | Staff | Same operations, but no Dashboard, Reports, Configuration, Settings, or product editing. |
| 10 | Customer | Portal: only their own subscriptions and invoices; print an invoice. |

---

## Roles and permissions

| Capability | ADMIN | STAFF | CUSTOMER |
| --- | :-: | :-: | :-: |
| Dashboard, Reports, Configuration, Settings | ✅ | — | — |
| Add staff | ✅ | — | — |
| Create, edit, or archive products, variants, plans | ✅ | read-only | — |
| Taxes, discounts, quotation templates | ✅ | — | — |
| Customers, subscriptions (create and lifecycle), checkout | ✅ | ✅ | — |
| Invoices (run billing, confirm, cancel, send, print), payments | ✅ | ✅ | — |
| Own subscriptions and confirmed invoices | — | — | ✅ |

Hiding a menu item is cosmetic. Every page, API route, and server action re-checks the session and role on the server.

---

## Business rules

- **Billing periods:** each period starts on the subscription's start date and repeats by its billing period. Month ends clamp (Jan 31 → Feb 28).
- **One invoice per period:** `(subscriptionId, periodStart)` is unique; the billing run advances `nextInvoiceDate` with compare-and-set. Running it repeatedly or concurrently is safe.
- **Expiry:** no invoices are created for periods starting on or after the expiry date. **Renew** extends expiry by one year. Plans marked *close automatically* are closed by the billing run once expired.
- **Pause:** paused periods are not billed. Resuming continues from today.
- **Prices:** always computed on the server from the catalog. A plan price replaces the product's sales price; a variant adds its extra price.
- **Taxes:** a product's tax rule, else the default rule, else 10% (the legacy engine default). Tax is calculated per rate on the discounted line amounts.
- **Discounts:** one rule per invoice — the most valuable eligible one. Its usage is counted when the invoice is created and released if the invoice is cancelled.
- **Due date and overdue:** due date = confirmation date + payment terms (*Due on Receipt* 0, *Net 7/15/30/60*). Overdue = confirmed, unpaid, and due date before today.
- **Revenue:** only recorded payments count as collected revenue. Draft invoices are never counted as revenue.
- **Customers** see invoices only after an operator confirms them.

---

## Routes

| Route | Who | Purpose |
| --- | --- | --- |
| `/` · `/login` · `/signup` | Public | Welcome, sign in, register (always creates a CUSTOMER) |
| `/forgot-password` · `/reset-password` | Public | Request and complete a password reset |
| `/admin` | Admin | Live dashboard |
| `/reports` | Admin | Finance summary for a date range |
| `/configuration` | Admin | Tax rules, discount rules, quotation templates |
| `/settings` | Admin | Workspace info, integration status, team and staff |
| `/staff` | Staff, Admin | Staff home |
| `/subscriptions` · `/subscriptions/new` · `/subscriptions/[id]` | Staff, Admin | List and filter, build quotation or draft, detail and lifecycle |
| `/invoices` · `/invoices/[id]` | Staff, Admin | List, filter (incl. Overdue), billing run; detail, confirm, send, cancel, pay |
| `/products` · `/products/[id]` · `/plans` | Staff, Admin | Catalog, variants, plans (admin edits) |
| `/customers` · `/checkout` | Staff, Admin | Customer list; quick monthly checkout |
| `/portal` · `/portal/subscriptions` · `/portal/invoices` | Customer | Own records |
| `/print/invoices/[id]` | Owner or operator | Printable invoice |
| `GET /api/auth/session`, `/api/subscriptions[/id]`, `/api/invoices[/id]` | Signed in | JSON, ownership-scoped, `Cache-Control: private, no-store` |

---

## Project structure

```
actions/            Server actions: auth, session, password, checkout, subscriptions,
                    invoices (billing run, confirm, cancel, send, payments), products,
                    catalog (plans, taxes, discounts, templates), team (staff)
app/(workspace)/    Authenticated pages (route group is not part of the URL)
app/print/          Printable invoice outside the app shell
components/         UI: dashboard, commerce (tables, builder, invoice), auth, ui primitives
lib/commerce/       rules.ts (statuses, periods, terms, transitions),
                    engine.ts (pricing, tax, discounts, period invoicing, billing run),
                    data.ts (authorized queries), guard.ts (action authorization)
lib/dashboard/      Dashboard and report aggregates
lib/auth/           Sessions, authorization, throttling
lib/email.ts        Email transport (development log / test file; no real provider yet)
prisma/schema.prisma
scripts/            setup-auth, setup-database, provision-user, seed-demo
tests/              Playwright end-to-end tests
```

### Data model

`User` · `Product` · `ProductVariant` · `Plan` · `QuotationTemplate` (+ lines) · `Subscription` · `SubscriptionLine` · `Invoice` · `InvoiceLine` · `Payment` · `TaxRule` · `DiscountRule` · `AuthSession` · `AuthAttempt` · `PasswordResetToken`. Money is stored as `Float` and rounded to cents in the engine; moving to integer cents would be a deliberate migration.

---

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `SESSION_SECRET` | Yes | 32+ characters; created by `npm run auth:setup`. Server-only. |
| `DATABASE_URL` | No | Overrides `file:./dev.db`. The provider stays SQLite. |
| `APP_URL` | Production | Trusted origin for password-reset links. |
| `EMAIL_TRANSPORT` | No | `console` (development default), `file` (tests, with `EMAIL_OUTBOX_DIR`). Production refuses to "send" without a configured transport. |
| `KAELIX_DEMO_PASSWORD` | No | Password for seeded demo customers. |
| `KAELIX_PROVISION_PASSWORD` | For provisioning | Password for `auth:provision`; never passed as a command-line argument. |

`.env`, database files, backups, and test output are git-ignored.

---

## Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Development server on :3000 |
| `npm run build` / `npm run start` | Production build (`next build --webpack`) and server |
| `npm run lint` | ESLint |
| `npm run test:e2e` | Playwright (Edge, isolated temporary database, port 3100) |
| `npm run db:setup` | Create or update the local SQLite schema (non-destructive) |
| `npm run db:seed-demo` | Add the Brightloop demo dataset (once) |
| `npm run auth:setup` | Generate `SESSION_SECRET` in `.env` |
| `npm run auth:provision -- --email … --role ADMIN\|STAFF` | Create a privileged account |

## Testing

```powershell
npm.cmd run lint
npm.cmd run build
npx.cmd playwright test
```

31 end-to-end tests cover: authentication, roles, ownership, and session security; signup rules; product and checkout pricing and tampering; the live dashboard; the billing run (catch-up, idempotency, discount usage limit); quotation → active → paused lifecycle with plan rules; invoice confirmation, partial and full payment, over-payment rejection; staff creation; password reset with single-use tokens and session revocation. Tests never touch `prisma/dev.db`.

---

## Not yet included

- **Real email delivery:** transports are development and test only. Needs a provider (SMTP, Resend, SES…) and credentials.
- **Online payments:** payments are recorded manually. A gateway needs a provider, test keys, signed webhooks, and reconciliation.
- **Odoo integration:** needs the Odoo version, URL, database, API key, and which records sync in which direction.
- **Scheduled billing:** billing runs on demand. A cron trigger calling the billing run is the next step.
- **Customer self-service:** pause, close, or renew from the portal (Odoo's *closable* / *renew* options for customers).
- **Hosted shared database:** currently local SQLite per developer.

## Further reading

- [AUTHENTICATION.md](AUTHENTICATION.md): session security, permissions, provisioning
- [FRONTEND.md](FRONTEND.md): UI contracts
