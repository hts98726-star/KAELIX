import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { signIn, signOut, type TestRole } from "./helpers/auth";
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.KAELIX_TEST_DATABASE_URL! } },
});
test.afterAll(async () => {
  await prisma.$disconnect();
});

test("public entry shows welcome and auth navigation without an admin sidebar", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "Log in to your account" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Create account", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Dashboard overview", { exact: false }),
  ).toHaveCount(0);
  await page.screenshot({ path: "artifacts/auth-welcome.png", fullPage: true });
  await page.getByRole("link", { name: "Log in to your account" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page
    .getByRole("link", { name: "Create an account", exact: true })
    .click();
  await expect(page).toHaveURL(/\/signup$/);
});

test("signup enforces server password policy, ignores a forged role, and leads to customer login", async ({
  page,
}) => {
  const email = `customer-${randomUUID()}@example.test`;
  await page.goto("/signup");
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("Aa!23456");
  await page.getByLabel("Confirm password", { exact: true }).fill("Aa!23456");
  await page.evaluate(() => {
    document.getElementById("signup-password")!.removeAttribute("minlength");
    document.getElementById("signup-confirm")!.removeAttribute("minlength");
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = "role";
    input.value = "ADMIN";
    document
      .querySelector('form[aria-label="Create account"]')!
      .appendChild(input);
  });
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(
    page.getByText("Password must be longer than 8 characters"),
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
  expect(user.role).toBe("CUSTOMER");
  expect(await bcrypt.compare("StrongPass!", user.passwordHash)).toBe(true);
  await page.getByRole("link", { name: "Continue to login" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Your customer account was created",
  );
  await signIn(page, "CUSTOMER", email);
  await expect(
    page.getByRole("heading", { name: "Customer Portal.", exact: true }),
  ).toBeVisible();
});

for (const role of ["ADMIN", "STAFF", "CUSTOMER"] as TestRole[]) {
  test(`${role} login restores a persistent server session and uses role routing`, async ({
    page,
    context,
  }) => {
    await signIn(page, role);
    const path =
      role === "ADMIN" ? "/admin" : role === "STAFF" ? "/staff" : "/portal";
    await page.reload();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    const response = await context.request.get("/api/auth/session");
    expect(response.status()).toBe(200);
    expect((await response.json()).user.role).toBe(role);
    const cookie = (await context.cookies()).find(
      (entry) => entry.name === "kaelix_session",
    )!;
    expect(cookie.httpOnly).toBe(true);
    expect(cookie.secure).toBe(true);
    expect(cookie.sameSite).toBe("Lax");
    expect(cookie.path).toBe("/");
    expect(cookie.expires).toBeGreaterThan(Date.now() / 1000);
    expect(await page.evaluate(() => document.cookie)).not.toContain(
      "kaelix_session",
    );
    expect(await response.text()).not.toContain("passwordHash");
    await page.goto("/");
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    if (role === "STAFF") {
      await expect(
        page
          .getByRole("navigation", { name: "Main navigation" })
          .getByRole("link", { name: "Dashboard", exact: true }),
      ).toHaveCount(0);
      await page.goto("/products");
      await expect(
        page.getByRole("heading", { name: "Good things to offer." }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Add product", exact: true }),
      ).toHaveCount(0);
    }
  });
}

test("invalid credentials are generic and do not establish a session", async ({
  page,
  context,
}) => {
  await page.goto("/login");
  await page
    .getByLabel("Email address", { exact: true })
    .fill("admin@example.test");
  await page.getByLabel("Password", { exact: true }).fill("WrongPassword!");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.getByRole("alert", { name: "Login error" })).toHaveText(
    "Email or password is incorrect.",
  );
  expect((await context.request.get("/api/auth/session")).status()).toBe(401);
  expect(
    (await context.cookies()).some((entry) => entry.name === "kaelix_session"),
  ).toBe(false);
});

test("unauthenticated pages redirect to login and protected APIs reject access", async ({
  page,
  request,
}) => {
  for (const path of [
    "/admin",
    "/staff",
    "/portal",
    "/checkout",
    "/products",
    "/customers",
    "/subscriptions",
    "/invoices",
    "/settings",
  ]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
  }
  for (const path of [
    "/api/auth/session",
    "/api/invoices",
    "/api/subscriptions",
    `/api/invoices/${randomUUID()}`,
    `/api/subscriptions/${randomUUID()}`,
  ]) {
    const response = await request.get(path);
    expect(response.status()).toBe(401);
    expect(response.headers()["cache-control"]).toContain("no-store");
  }
});

test("customers cannot open management routes or read another customer's records", async ({
  page,
  context,
}) => {
  await signIn(page, "CUSTOMER");
  await expect(
    page.getByText("E2E-OWN-CUSTOMER", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByText("E2E-OTHER-CUSTOMER", { exact: true }),
  ).toHaveCount(0);
  const other = await prisma.subscription.findUniqueOrThrow({
    where: { planNumber: "E2E-OTHER-CUSTOMER" },
    include: { invoices: true },
  });
  const own = await prisma.user.findUniqueOrThrow({
    where: { email: "checkout@example.test" },
  });
  const subscriptions = await context.request.get(
    `/api/subscriptions?userId=${other.userId}`,
  );
  expect(
    (await subscriptions.json()).data.every(
      (item: { userId: string }) => item.userId === own.id,
    ),
  ).toBe(true);
  expect(
    (await context.request.get(`/api/subscriptions/${other.id}`)).status(),
  ).toBe(404);
  expect(
    (
      await context.request.get(`/api/invoices/${other.invoices[0].id}`)
    ).status(),
  ).toBe(404);
  const ownInvoice = await prisma.invoice.findFirstOrThrow({
    where: { subscription: { planNumber: "E2E-OWN-CUSTOMER" } },
  });
  expect(
    (await context.request.get(`/api/invoices/${ownInvoice.id}`)).status(),
  ).toBe(200);
  await page.evaluate(() => localStorage.setItem("role", "ADMIN"));
  for (const path of [
    "/admin",
    "/staff",
    "/products",
    "/checkout",
    "/customers",
    "/settings",
    "/subscriptions",
    "/invoices",
  ]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/access-denied$/);
    await expect(
      page.getByRole("heading", { name: "Access denied" }),
    ).toBeVisible();
  }
});

test("staff cannot open admin dashboard or administrator settings", async ({
  page,
}) => {
  await signIn(page, "STAFF");
  for (const path of ["/admin", "/settings"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/access-denied$/);
  }
  await page.goto("/checkout");
  await expect(
    page.getByRole("heading", { name: "Make it official." }),
  ).toBeVisible();
});

test("logout revokes the database session and rejects replay of its previous cookie", async ({
  page,
  context,
  request,
}) => {
  await signIn(page, "CUSTOMER");
  const cookie = (await context.cookies()).find(
    (entry) => entry.name === "kaelix_session",
  )!;
  await signOut(page);
  expect((await context.request.get("/api/auth/session")).status()).toBe(401);
  expect(
    (
      await request.get("/api/auth/session", {
        headers: { Cookie: `kaelix_session=${cookie.value}` },
      })
    ).status(),
  ).toBe(401);
  await page.goto("/portal");
  await expect(page).toHaveURL(/\/login$/);
});

test("expired sessions and database role changes take effect on the next request", async ({
  page,
  context,
}) => {
  const user = await prisma.user.create({
    data: {
      email: `session-${randomUUID()}@example.test`,
      passwordHash: await bcrypt.hash("StrongPass!", 10),
      role: "ADMIN",
    },
  });
  await signIn(page, "ADMIN", user.email);
  await prisma.user.update({
    where: { id: user.id },
    data: { role: "CUSTOMER" },
  });
  const session = await context.request.get("/api/auth/session");
  expect((await session.json()).user.role).toBe("CUSTOMER");
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/access-denied$/);
  await prisma.authSession.updateMany({
    where: { userId: user.id },
    data: { expiresAt: new Date(Date.now() - 1000) },
  });
  expect((await context.request.get("/api/auth/session")).status()).toBe(401);
  await page.goto("/portal");
  await expect(page).toHaveURL(/\/login$/);
});

test("forged session cookies fail closed", async ({ browser }) => {
  const context = await browser.newContext();
  try {
    await context.addCookies([
      {
        name: "kaelix_session",
        value: "forged-admin-session",
        domain: "localhost",
        path: "/",
        httpOnly: true,
        secure: true,
      },
    ]);
    expect(
      (
        await context.request.get("http://localhost:3100/api/auth/session")
      ).status(),
    ).toBe(401);
    const page = await context.newPage();
    await page.goto("http://localhost:3100/admin");
    await expect(page).toHaveURL(/\/login$/);
  } finally {
    await context.close();
  }
});

test("server actions deny product and checkout mutations without the required role", async ({
  page,
  browser,
}) => {
  await signIn(page, "ADMIN");
  const name = `Role guard ${randomUUID().slice(0, 8)}`;
  await page.goto("/products");
  let productRequest:
    { headers: Record<string, string>; body: Buffer } | undefined;
  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      request.url().endsWith("/products") &&
      request.headers()["next-action"]
    )
      productRequest = {
        headers: request.headers(),
        body: request.postDataBuffer()!,
      };
  });
  await page.getByLabel("Product name", { exact: true }).fill(name);
  await page.getByLabel("Monthly base price ($)", { exact: true }).fill("10");
  await page.getByRole("button", { name: "Add product", exact: true }).click();
  await expect(
    page.getByRole("status", { name: "Catalog result" }),
  ).toContainText("Product added");
  expect(productRequest).toBeDefined();
  await page.goto("/checkout");
  await page.getByRole("combobox", { name: "Customer", exact: true }).click();
  await page
    .getByRole("option", { name: "checkout@example.test", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Select Pulse Starter", exact: true })
    .click();
  let checkoutRequest:
    { headers: Record<string, string>; body: Buffer } | undefined;
  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      request.url().endsWith("/checkout") &&
      request.headers()["next-action"]
    )
      checkoutRequest = {
        headers: request.headers(),
        body: request.postDataBuffer()!,
      };
  });
  await page
    .getByRole("button", { name: "Create subscription", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "A new subscription. All set." }),
  ).toBeVisible();
  expect(checkoutRequest).toBeDefined();
  for (const role of [null, "CUSTOMER", "STAFF"] as const) {
    const context = await browser.newContext({
      baseURL: "http://localhost:3100",
    });
    try {
      if (role) await signIn(await context.newPage(), role);
      for (const [path, record] of [
        ["/products", productRequest!],
        ...(role !== "STAFF" ? [["/checkout", checkoutRequest!]] : []),
      ] as [string, { headers: Record<string, string>; body: Buffer }][]) {
        const headers = {
          "next-action": record.headers["next-action"],
          "content-type": record.headers["content-type"],
          origin: "http://localhost:3100",
        };
        const response = await context.request.post(path, {
          headers,
          data: record.body,
        });
        const body = await response.text();
        expect(body).toContain(
          role ? "You do not have permission" : "Sign in to continue",
        );
      }
    } finally {
      await context.close();
    }
  }
  expect(await prisma.product.count({ where: { name } })).toBe(1);
});

test("legacy mixed-case emails and existing eight-character passwords still sign in", async ({
  page,
}) => {
  const email = `Legacy-${randomUUID()}@Example.test`;
  await prisma.user.create({
    data: {
      email,
      role: "CUSTOMER",
      passwordHash: await bcrypt.hash("Aa!23456", 10),
    },
  });
  await signIn(page, "CUSTOMER", email.toLowerCase(), "Aa!23456");
  await expect(
    page.getByRole("heading", { name: "Customer Portal.", exact: true }),
  ).toBeVisible();
});

test("repeated failed sign-ins are throttled without issuing a cookie", async ({
  page,
  context,
}) => {
  await page.goto("/login");
  await page
    .getByLabel("Email address", { exact: true })
    .fill(`attempt-${randomUUID()}@example.test`);
  await page.getByLabel("Password", { exact: true }).fill("WrongPassword!");
  for (let index = 0; index < 10; index++) {
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await expect(page.getByRole("alert", { name: "Login error" })).toHaveText(
      "Email or password is incorrect.",
    );
    await expect(
      page.getByRole("button", { name: "Log in", exact: true }),
    ).toBeEnabled();
  }
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.getByRole("alert", { name: "Login error" })).toContainText(
    "Too many sign-in attempts",
  );
  expect((await context.request.get("/api/auth/session")).status()).toBe(401);
});

test("controlled CLI provisions staff without overwriting an existing account", async ({
  page,
}) => {
  const email = `provision-${randomUUID()}@example.test`;
  const args = [
    resolve("scripts/provision-user.mjs"),
    "--email",
    email,
    "--role",
    "STAFF",
  ];
  const env = {
    ...process.env,
    DATABASE_URL: process.env.KAELIX_TEST_DATABASE_URL!,
    KAELIX_PROVISION_PASSWORD: "StrongPass!",
  };
  const output = execFileSync(process.execPath, args, {
    env,
    encoding: "utf8",
  });
  expect(output).toContain("Created STAFF account");
  expect(output).not.toContain("StrongPass!");
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  expect(user.role).toBe("STAFF");
  expect(await bcrypt.compare("StrongPass!", user.passwordHash)).toBe(true);
  let refused = false;
  try {
    execFileSync(process.execPath, args, { env, stdio: "pipe" });
  } catch {
    refused = true;
  }
  expect(refused).toBe(true);
  expect(
    (await prisma.user.findUniqueOrThrow({ where: { email } })).passwordHash,
  ).toBe(user.passwordHash);
  await signIn(page, "STAFF", email);
});
