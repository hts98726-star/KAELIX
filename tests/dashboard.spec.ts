import { expect, test } from "@playwright/test";
import { signIn } from "./helpers/auth";
test.beforeEach(async ({ page }) => {
  await signIn(page, "ADMIN");
});

test("dashboard renders metrics and filters subscriptions with an empty recovery state", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Dashboard overview." }),
  ).toBeVisible();
  for (const label of [
    "Active Subscriptions",
    "Total Revenue",
    "Pending Payments",
    "Overdue Invoices",
  ])
    await expect(page.getByText(label, { exact: true })).toBeVisible();
  const search = page.getByRole("textbox", { name: "Search subscriptions" });
  await search.fill("olivia");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.getByText("Olivia Rhye", { exact: true })).toBeVisible();
  await page.getByRole("combobox", { name: "Filter by status" }).click();
  await page.getByRole("option", { name: "Overdue", exact: true }).click();
  await expect(page.getByText("No subscriptions found")).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(5);
  await page.getByRole("combobox", { name: "Filter by status" }).click();
  await page.getByRole("option", { name: "Overdue", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(2);
  await expect(page.getByText("Drew Cano", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("pagination, detail dialog, sorting, and filtered CSV export work", async ({
  page,
}) => {
  await page.goto("/admin");
  await page.getByRole("button", { name: "Next page" }).click();
  await expect(page.getByText("Natali Craig", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "View Natali Craig subscription" })
    .click();
  await expect(page.getByRole("dialog")).toContainText("SUB-006");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Previous page" }).click();
  await page.getByRole("button", { name: "Customer" }).click();
  await expect(page.locator("tbody tr").first()).toContainText("Alex Morgan");
  await page
    .getByRole("textbox", { name: "Search subscriptions" })
    .fill("olivia");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(
    "kaelix-pulse-demo-subscriptions.csv",
  );
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const contents = Buffer.concat(chunks).toString("utf8");
  expect(contents).toContain("Olivia Rhye");
  expect(contents).not.toContain("Phoenix Baker");
});

test("demo subscription creation stays local and route navigation works", async ({
  page,
}) => {
  const mutations: string[] = [];
  page.on("request", (request) => {
    if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method()))
      mutations.push(request.url());
  });
  await page.goto("/admin");
  await page.getByRole("button", { name: "New subscription" }).click();
  await page
    .getByRole("textbox", { name: "Customer name" })
    .fill("Test Customer");
  await page
    .getByRole("textbox", { name: "Email address" })
    .fill("test@example.com");
  await page.getByRole("button", { name: "Add demo subscription" }).click();
  await expect(page.getByText("Test Customer", { exact: true })).toBeVisible();
  expect(mutations).toEqual([]);
  await page.reload();
  await expect(page.getByText("Test Customer", { exact: true })).toHaveCount(0);
  for (const label of [
    "Subscriptions",
    "Invoices",
    "Customers",
    "Settings",
    "Dashboard",
  ]) {
    await page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name: label, exact: label !== "Subscriptions" })
      .click();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
});

test("chart controls, sidebar collapse, and desktop screenshot", async ({
  page,
}) => {
  await page.goto("/admin");
  await page
    .getByRole("combobox", { name: "Revenue chart date range" })
    .click();
  await page.getByRole("option", { name: "Last 3 months" }).click();
  await expect(
    page.getByRole("img", { name: "Monthly revenue comparison" }),
  ).not.toContainText("May:");
  await page.getByRole("button", { name: "Comparison period" }).click();
  await expect(
    page.getByRole("button", { name: "Comparison period" }),
  ).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "Collapse sidebar" }).click();
  await expect(
    page.getByRole("button", { name: "Expand sidebar" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Expand sidebar" }).click();
  await page
    .getByRole("combobox", { name: "Revenue chart date range" })
    .click();
  await page.getByRole("option", { name: "Last 6 months" }).click();
  await page.getByRole("button", { name: "Comparison period" }).click();
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
