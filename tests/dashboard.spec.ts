import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { signIn } from "./helpers/auth";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.KAELIX_TEST_DATABASE_URL! } },
});
test.afterAll(() => prisma.$disconnect());
test.beforeEach(async ({ page }) => {
  await signIn(page, "ADMIN");
});

test("dashboard shows live metrics and filters real subscriptions", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Dashboard overview." }),
  ).toBeVisible();
  await expect(page.getByText("DEMO WORKSPACE")).toHaveCount(0);
  for (const label of [
    "Active Subscriptions",
    "Revenue Collected",
    "Outstanding",
    "Overdue Invoices",
  ])
    await expect(page.getByText(label, { exact: true })).toBeVisible();
  // The overdue fixture is the only confirmed invoice past its due date.
  const overdue = page
    .getByText("Overdue Invoices", { exact: true })
    .locator("xpath=ancestor::div[contains(@class,'relative')][1]");
  await expect(overdue).toContainText("$22.00 past due");
  await expect(page.getByText("E2E Plan Monthly").first()).toBeVisible();

  const search = page.getByRole("textbox", { name: "Search subscriptions" });
  await search.fill("olivia");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.getByText("Olivia Rhye", { exact: true })).toBeVisible();
  await search.fill("dashfix");
  await page.getByRole("combobox", { name: "Filter by status" }).click();
  await page.getByRole("option", { name: "Closed", exact: true }).click();
  await expect(page.getByText("No subscriptions found")).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await search.fill("dashfix");
  await expect(page.locator("tbody tr")).toHaveCount(5);
  await page.getByRole("combobox", { name: "Filter by status" }).click();
  await page.getByRole("option", { name: "Paused", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.getByText("Drew Cano", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("pagination, detail dialog, sorting, and filtered CSV export work", async ({
  page,
}) => {
  await page.goto("/admin");
  await page
    .getByRole("textbox", { name: "Search subscriptions" })
    .fill("dashfix");
  await page.getByRole("button", { name: "Next page" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.getByRole("button", { name: "Previous page" }).click();
  await page.getByRole("button", { name: "Customer" }).click();
  await expect(page.locator("tbody tr").first()).toContainText("Alex Morgan");
  await page
    .getByRole("button", { name: "View Alex Morgan subscription" })
    .click();
  await expect(page.getByRole("dialog")).toContainText("DASH-003");
  await page.getByRole("link", { name: "Open subscription" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "DASH-003",
  );
  await page.goto("/admin");
  await page
    .getByRole("textbox", { name: "Search subscriptions" })
    .fill("olivia");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("kaelix-pulse-subscriptions.csv");
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const contents = Buffer.concat(chunks).toString("utf8");
  expect(contents).toContain("Olivia Rhye");
  expect(contents).toContain("DASH-001");
  expect(contents).not.toContain("Phoenix Baker");
});

test("new subscription opens the real builder and route navigation works", async ({
  page,
}) => {
  await page.goto("/admin");
  await page.getByRole("link", { name: "New subscription" }).click();
  await expect(page).toHaveURL(/\/subscriptions\/new$/);
  await expect(
    page.getByRole("form", { name: "New subscription" }),
  ).toBeVisible();
  for (const label of [
    "Subscriptions",
    "Invoices",
    "Customers",
    "Plans",
    "Reports",
    "Configuration",
    "Settings",
    "Dashboard",
  ]) {
    await page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name: label, exact: true })
      .click();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
});

test("chart controls, sidebar collapse, and desktop screenshot", async ({
  page,
}) => {
  await page.goto("/admin");
  const chart = page.getByRole("img", { name: "Monthly revenue comparison" });
  await page
    .getByRole("combobox", { name: "Revenue chart date range" })
    .click();
  await page.getByRole("option", { name: "Last 3 months" }).click();
  await expect
    .poll(async () => ((await chart.textContent()) ?? "").split("collected").length - 1)
    .toBe(3);
  await page.getByRole("button", { name: "Invoiced" }).click();
  await expect(page.getByRole("button", { name: "Invoiced" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await page.getByRole("button", { name: "Collapse sidebar" }).click();
  await expect(
    page.getByRole("button", { name: "Expand sidebar" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Expand sidebar" }).click();
  await page
    .getByRole("combobox", { name: "Revenue chart date range" })
    .click();
  await page.getByRole("option", { name: "Last 6 months" }).click();
  await page.getByRole("button", { name: "Invoiced" }).click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.screenshot({
    path: "artifacts/dashboard-desktop.png",
    fullPage: true,
  });
});


test("mobile navigation traps focus, closes, and content fits the viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin");
  await page.getByRole("button", { name: "Open navigation" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog).toContainText("Navigation");
  expect(
    await dialog.evaluate((element) =>
      element.contains(document.activeElement),
    ),
  ).toBeTruthy();
  await dialog
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Subscriptions" })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Subscriptions." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("dialog")
    .getByRole("link", { name: "Dashboard", exact: true })
    .click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.screenshot({
    path: "artifacts/dashboard-mobile.png",
    fullPage: true,
  });
  const overflow = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    elements: [...document.querySelectorAll("body *")]
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return (
          rect.right > window.innerWidth ||
          element.scrollWidth > element.clientWidth + 2
        );
      })
      .map((element) => ({
        tag: element.tagName,
        className: element.getAttribute("class"),
        right: element.getBoundingClientRect().right,
        client: element.clientWidth,
        scroll: element.scrollWidth,
        position: getComputedStyle(element).position,
        overflow: getComputedStyle(element).overflow,
      }))
      .slice(0, 30),
  }));
  expect(overflow.document, JSON.stringify(overflow)).toBeLessThanOrEqual(
    overflow.viewport,
  );
});
