import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { signIn } from "./helpers/auth";
test.beforeEach(async ({ page }, info) => {
  if (
    !info.title.startsWith("signup handles") &&
    !info.title.startsWith("signup and checkout")
  )
    await signIn(page, "ADMIN");
});

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.KAELIX_TEST_DATABASE_URL! } },
});
test.afterAll(async () => {
  await prisma.$disconnect();
});
async function fillSignup(page: Page, email: string, password = "StrongPass!") {
  await page.goto("/signup");
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password", { exact: true }).fill(password);
}
async function selectCheckout(page: Page, email = "checkout@example.test") {
  await page.goto("/checkout");
  await page.getByRole("combobox", { name: "Customer", exact: true }).click();
  await page.getByRole("option", { name: email, exact: true }).click();
  await page
    .getByRole("button", { name: "Select Pulse Starter", exact: true })
    .click();
}

test("signup handles mismatches and server validation, persists a hashed password, and rejects duplicates", async ({
  page,
}) => {
  const email = `signup-${randomUUID()}@example.test`;
  await fillSignup(page, email);
  await page.screenshot({
    path: "artifacts/signup-desktop.png",
    fullPage: true,
  });
  await page
    .getByLabel("Confirm password", { exact: true })
    .fill("DifferentPass!");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page.getByText("Your passwords don’t match.")).toBeVisible();
  await page.getByLabel("Password", { exact: true }).fill("weakpassword");
  await page
    .getByLabel("Confirm password", { exact: true })
    .fill("weakpassword");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(
    page.getByText(/Must contain at least one uppercase letter/),
  ).toBeVisible();
  expect(await prisma.user.findUnique({ where: { email } })).toBeNull();
  await page.getByLabel("Password", { exact: true }).fill("StrongPass!");
  await page
    .getByLabel("Confirm password", { exact: true })
    .fill("StrongPass!");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "You’re on the list." }),
  ).toBeVisible();
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  expect(user.passwordHash).not.toBe("StrongPass!");
  expect(await bcrypt.compare("StrongPass!", user.passwordHash)).toBe(true);
  await signIn(page, "ADMIN");
  await page.goto("/customers");
  await expect(
    page.getByRole("heading", { name: email, exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: email, exact: true }),
  ).toBeVisible();
  await fillSignup(page, email.toUpperCase());
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(
    page.getByRole("alert", { name: "Registration error" }),
  ).toContainText("An account with this email already exists.");
});

test("checkout uses server catalog prices and persists its invoice and subscription", async ({
  page,
}) => {
  await selectCheckout(page);
  await page.getByLabel("Pulse Starter quantity", { exact: true }).fill("2");
  await expect(page.getByTestId("checkout-total")).toHaveText("$64.35");
  let tampered = false;
  await page.route("**/checkout", async (route) => {
    const request = route.request();
    if (request.method() === "POST" && request.headers()["next-action"]) {
      const body = JSON.parse(request.postData()!);
      body[1][0].basePrice = 0.01;
      body[1][0].variants = [
        { id: "fake", name: "fake discount", markupPrice: -500 },
      ];
      tampered = true;
      await route.continue({ postData: JSON.stringify(body) });
    } else await route.continue();
  });
  await page
    .getByRole("button", { name: "Create subscription", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "A new subscription. All set." }),
  ).toBeVisible();
  expect(tampered).toBe(true);
  const invoiceId = (await page
    .getByTestId("invoice-reference")
    .textContent())!;
  const invoice = await prisma.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    include: { subscription: { include: { lines: true } } },
  });
  expect(invoice.subTotal).toBe(58.5);
  expect(invoice.taxAmount).toBe(5.85);
  expect(invoice.grandTotal).toBe(64.35);
  expect(invoice.status).toBe("DRAFT");
  expect(invoice.subscription.lines[0].unitPrice).toBe(29.25);
  expect(invoice.subscription.lines[0].quantity).toBe(2);
  await page.getByRole("link", { name: "View invoices", exact: true }).click();
  await expect(page).toHaveURL(/\/invoices$/);
  await expect(
    page.getByRole("table").getByText(invoiceId, { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("table").getByText(invoiceId, { exact: true }),
  ).toBeVisible();
  await page.goto("/subscriptions");
  await expect(
    page
      .getByRole("table")
      .getByText(invoice.subscription.planNumber, { exact: true }),
  ).toBeVisible();
});

test("checkout rejects tampered quantities without creating records", async ({
  page,
}) => {
  const customer = await prisma.user.create({
    data: {
      email: `invalid-${randomUUID()}@example.test`,
      passwordHash: "test-only",
      role: "CUSTOMER",
    },
  });
  await selectCheckout(page, customer.email);
  await page.route("**/checkout", async (route) => {
    const request = route.request();
    if (request.method() === "POST" && request.headers()["next-action"]) {
      const body = JSON.parse(request.postData()!);
      body[1][0].quantity = -2;
      await route.continue({ postData: JSON.stringify(body) });
    } else await route.continue();
  });
  await page
    .getByRole("button", { name: "Create subscription", exact: true })
    .click();
  await expect(
    page.getByRole("alert", { name: "Checkout error" }),
  ).toContainText("quantities from 1 to 999");
  expect(
    await prisma.subscription.count({ where: { userId: customer.id } }),
  ).toBe(0);
  expect(
    await prisma.invoice.count({
      where: { subscription: { userId: customer.id } },
    }),
  ).toBe(0);
});

test("checkout includes catalog variant markup, and removing products restores the empty summary", async ({
  page,
}) => {
  await selectCheckout(page);
  await page
    .getByRole("button", { name: "Remove Pulse Starter", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Create subscription", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Select Pulse Professional", exact: true })
    .click();
  await expect(page.getByTestId("checkout-total")).toHaveText("$92.40");
  await page.screenshot({
    path: "artifacts/checkout-desktop.png",
    fullPage: true,
  });
});

test("signup and checkout fit mobile and expose accessible form controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/signup");
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Show password", exact: true })
    .click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute(
    "type",
    "text",
  );
  await page.screenshot({
    path: "artifacts/signup-mobile.png",
    fullPage: false,
  });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await signIn(page, "ADMIN");
  await selectCheckout(page);
  await page.evaluate(async () => {
    window.scrollTo(0, 0);
    await document.fonts.ready;
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  });
  await page.screenshot({
    path: "artifacts/checkout-mobile.png",
    fullPage: false,
  });
  await page
    .getByRole("button", { name: "Create subscription", exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({ path: "artifacts/checkout-mobile-summary.png" });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
});

test("catalog validates variant markup and makes new products available at checkout", async ({
  page,
}) => {
  const name = `Workspace service ${randomUUID().slice(0, 8)}`;
  await page.goto("/products");
  await page.getByLabel("Product name", { exact: true }).fill(name);
  await page
    .getByLabel("Monthly base price ($)", { exact: true })
    .fill("19.99");
  await page.getByLabel("Variant markup ($)", { exact: true }).fill("5.25");
  await page.getByRole("button", { name: "Add product", exact: true }).click();
  await expect(
    page.getByRole("alert", { name: "Catalog result" }),
  ).toContainText("Add a variant name");
  expect(await prisma.product.count({ where: { name } })).toBe(0);
  await page
    .getByLabel("Variant name", { exact: false })
    .fill("Priority support");
  await page.getByRole("button", { name: "Add product", exact: true }).click();
  await expect(
    page.getByRole("status", { name: "Catalog result" }),
  ).toContainText("Product added");
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  const product = await prisma.product.findFirstOrThrow({ where: { name } });
  expect(product.basePrice).toBe(19.99);
  expect(product.markupPrice).toBe(5.25);
  await page.goto("/checkout");
  await page
    .getByRole("button", { name: `Select ${name}`, exact: true })
    .click();
  await expect(page.getByTestId("checkout-total")).toHaveText("$27.76");
});
