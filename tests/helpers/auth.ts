import { expect, type Page } from "@playwright/test";
export type TestRole = "ADMIN" | "STAFF" | "CUSTOMER";
export async function signIn(
  page: Page,
  role: TestRole = "ADMIN",
  email?: string,
  password = "StrongPass!",
) {
  await page.goto("/login");
  await page
    .getByLabel("Email address", { exact: true })
    .fill(
      email ??
        (role === "ADMIN"
          ? "admin@example.test"
          : role === "STAFF"
            ? "staff@example.test"
            : "checkout@example.test"),
    );
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page).toHaveURL(
    role === "ADMIN" ? /\/admin$/ : role === "STAFF" ? /\/staff$/ : /\/portal$/,
  );
}
export async function signOut(page: Page) {
  await page.getByRole("button", { name: "Open account menu" }).click();
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
}
