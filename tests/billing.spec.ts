import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { signIn } from "./helpers/auth";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.KAELIX_TEST_DATABASE_URL! } },
});
test.afterAll(() => prisma.$disconnect());

function monthlyPeriodsUntilNow(start: Date) {
  let count = 0;
  const next = new Date(start);
  const day = start.getUTCDate();
  while (next <= new Date()) {
    count++;
    next.setUTCDate(1);
    next.setUTCMonth(next.getUTCMonth() + 1);
    const last = new Date(
      Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0),
    ).getUTCDate();
    next.setUTCDate(Math.min(day, last));
  }
  return count;
}

test("billing run invoices every missed period once and applies a one-use discount", async ({
  page,
}) => {
  const subscription = await prisma.subscription.findUniqueOrThrow({
    where: { planNumber: "E2E-BILLING-DUE" },
  });
  const expected = monthlyPeriodsUntilNow(subscription.startDate);
  await signIn(page, "ADMIN");
  await page.goto("/invoices");
  await page.getByRole("button", { name: "Run billing now" }).click();
  await expect(
    page.getByRole("status", { name: "Run billing now result" }),
  ).toContainText("Billing run complete");
  const invoices = await prisma.invoice.findMany({
    where: { subscriptionId: subscription.id },
    include: { lines: true },
    orderBy: { periodStart: "asc" },
  });
  expect(invoices).toHaveLength(expected);
  expect(invoices.every((invoice) => invoice.status === "DRAFT")).toBe(true);
  // 10 seats × $10 with 10% tax; the volume rule applies to exactly one invoice.
  const discounted = invoices.filter((i) => i.discountAmount > 0);
  expect(discounted).toHaveLength(1);
  expect(discounted[0].discountAmount).toBe(10);
  expect(discounted[0].taxAmount).toBe(9);
  expect(discounted[0].grandTotal).toBe(99);
  expect(
    invoices.filter((i) => i.discountAmount === 0).every((i) => i.grandTotal === 110),
  ).toBe(true);
  expect(invoices[0].lines[0]).toMatchObject({
    description: "E2E Volume Seat",
    quantity: 10,
    unitPrice: 10,
  });
  const advanced = await prisma.subscription.findUniqueOrThrow({
    where: { id: subscription.id },
  });
  expect(advanced.nextInvoiceDate!.getTime()).toBeGreaterThan(Date.now());

  // Running billing again never bills a period twice.
  await page.reload();
  await page.getByRole("button", { name: "Run billing now" }).click();
  await expect(
    page.getByRole("status", { name: "Run billing now result" }),
  ).toContainText("Billing run complete");
  expect(
    await prisma.invoice.count({ where: { subscriptionId: subscription.id } }),
  ).toBe(expected);
});

test("quotation becomes an active subscription, and its invoice is confirmed and paid", async ({
  page,
}) => {
  await signIn(page, "ADMIN");
  await page.goto("/subscriptions/new");
  await page
    .getByLabel("Customer", { exact: true })
    .selectOption({ label: "lifecycle@example.test" });
  await page
    .getByLabel("Recurring plan", { exact: true })
    .selectOption({ label: "E2E Plan Monthly · $20.00/mo" });
  await page.getByLabel("Plan quantity", { exact: true }).fill("2");
  await page.getByLabel("Payment terms", { exact: true }).selectOption("Net 15");
  await expect(page.getByTestId("subscription-estimate")).toContainText("$40.00");
  await page.getByRole("button", { name: "Save quotation" }).click();
  await expect(page).toHaveURL(/\/subscriptions\/[0-9a-f-]{36}$/);
  const actions = page.getByLabel("Subscription actions");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Quotation");

  await actions.getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Confirmed");
  await actions.getByRole("button", { name: "Start subscription" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Active");
  // The plan is not closable early, so Close is not offered once active.
  await expect(actions.getByRole("button", { name: "Close" })).toHaveCount(0);
  await actions.getByRole("button", { name: "Pause" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Paused");
  await actions.getByRole("button", { name: "Resume" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Active");

  const subscription = await prisma.subscription.findFirstOrThrow({
    where: { user: { email: "lifecycle@example.test" } },
    include: { invoices: true, lines: true },
  });
  expect(subscription.lines[0]).toMatchObject({ quantity: 2, unitPrice: 20 });
  expect(subscription.invoices).toHaveLength(1);
  const invoice = subscription.invoices[0];
  expect(invoice).toMatchObject({ subTotal: 40, taxAmount: 4, grandTotal: 44, status: "DRAFT" });

  await page.getByRole("link", { name: "Draft", exact: true }).click();
  await page.getByRole("button", { name: "Confirm invoice" }).click();
  await expect(page.getByLabel("Invoice document")).toContainText("Invoice INV/");
  await page.getByLabel("Amount ($)").fill("10");
  await page.getByLabel("Method").selectOption("CASH");
  await page.getByRole("button", { name: "Record payment" }).click();
  await expect(page.getByRole("status", { name: "Record payment result" })).toContainText(
    "Partial payment recorded",
  );
  await expect(page.getByTestId("invoice-balance")).toHaveText("$34.00");
  await page.getByLabel("Amount ($)").fill("40");
  await page.getByRole("button", { name: "Record payment" }).click();
  await expect(page.getByRole("alert", { name: "Record payment result" })).toContainText(
    "exceeds the outstanding balance",
  );
  await page.getByLabel("Amount ($)").fill("34");
  await page.getByRole("button", { name: "Record payment" }).click();
  await expect(page.getByTestId("invoice-balance")).toHaveText("$0.00");
  const paid = await prisma.invoice.findUniqueOrThrow({
    where: { id: invoice.id },
    include: { payments: true },
  });
  expect(paid.status).toBe("PAID");
  expect(paid.number).toMatch(/^INV\/\d{4}\/\d{5}$/);
  expect(paid.payments.map((p) => p.amount).sort()).toEqual([10, 34]);
});

test("only an administrator adds staff, and existing accounts are never changed", async ({
  page,
}) => {
  const email = `staff-${Date.now()}@example.test`;
  await signIn(page, "ADMIN");
  await page.goto("/settings");
  const form = page.getByRole("form", { name: "Add staff member" });
  await form.getByLabel("Full name").fill("Sam Staff");
  await form.getByLabel("Work email").fill(email);
  await form.getByLabel("Temporary password").fill("Temp!Pass123");
  await form.getByRole("button", { name: "Add staff member" }).click();
  await expect(page.getByRole("status", { name: "Add staff member result" })).toContainText(
    "created",
  );
  const staff = await prisma.user.findUniqueOrThrow({ where: { email } });
  expect(staff.role).toBe("STAFF");
  expect(await bcrypt.compare("Temp!Pass123", staff.passwordHash)).toBe(true);
  await expect(page.getByRole("list", { name: "Team members" })).toContainText("Sam Staff");

  await form.getByLabel("Work email").fill("checkout@example.test");
  await form.getByLabel("Temporary password").fill("Temp!Pass123");
  await form.getByRole("button", { name: "Add staff member" }).click();
  await expect(page.getByRole("alert", { name: "Add staff member result" })).toContainText(
    "already exists",
  );
  expect(
    (await prisma.user.findUniqueOrThrow({ where: { email: "checkout@example.test" } })).role,
  ).toBe("CUSTOMER");
});

test("password reset uses a single-use emailed link and signs out other sessions", async ({
  page,
  browser,
}) => {
  const email = "reset@example.test";
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await signIn(otherPage, "CUSTOMER", email);

  await page.goto("/login");
  await page.getByRole("link", { name: "Forgot your password?" }).click();
  await expect(
    page.getByRole("form", { name: "Request password reset" }),
  ).toBeVisible();
  await page
    .getByRole("form", { name: "Request password reset" })
    .getByLabel("Email address")
    .fill(email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByText("If an account exists")).toBeVisible();
  const outbox = process.env.KAELIX_TEST_OUTBOX!;
  const message = readdirSync(outbox)
    .map((file) => JSON.parse(readFileSync(join(outbox, file), "utf8")))
    .find((entry) => entry.to === email);
  expect(message).toBeDefined();
  const link = String(message.text).match(/http:\/\/localhost:3100\/reset-password\?token=[\w-]+/)![0];
  // Only a digest of the token is stored.
  const token = new URL(link).searchParams.get("token")!;
  expect(
    await prisma.passwordResetToken.count({ where: { tokenHash: token } }),
  ).toBe(0);

  await page.goto(link);
  await page.getByLabel("New password", { exact: true }).fill("Brand!NewPass9");
  await page.getByLabel("Confirm new password").fill("Brand!NewPass9");
  await page.getByRole("button", { name: "Reset password" }).click();
  await expect(page).toHaveURL(/\/login\?reset=1$/);
  await expect(page.getByText("Your password was reset.")).toBeVisible();

  await otherPage.goto("/portal");
  await expect(otherPage).toHaveURL(/\/login$/);
  await other.close();

  await page.goto(link);
  await page.getByLabel("New password", { exact: true }).fill("Another!Pass9");
  await page.getByLabel("Confirm new password").fill("Another!Pass9");
  await page.getByRole("button", { name: "Reset password" }).click();
  await expect(page.getByText("This reset link is invalid or has expired.")).toBeVisible();

  await signIn(page, "CUSTOMER", email, "Brand!NewPass9");
});
