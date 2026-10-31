import { defineConfig } from "@playwright/test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";

// Propagate one fresh, isolated database to setup, browser server, and test workers.
process.env.KAELIX_TEST_DATABASE_URL ??= `file:${join(mkdtempSync(join(tmpdir(), "kaelix-e2e-")), "workspace.db").replaceAll("\\", "/")}`;

process.env.KAELIX_TEST_SESSION_SECRET ??=
  randomBytes(48).toString("base64url");

export default defineConfig({
  testDir: "./tests",
  globalSetup: "./tests/global-setup.ts",
  fullyParallel: true,
  workers: 2,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3100",
    channel: "msedge",
    headless: true,
    viewport: { width: 1440, height: 1080 },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run start -- --port 3100",
    url: "http://localhost:3100",
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      DATABASE_URL: process.env.KAELIX_TEST_DATABASE_URL,
      SESSION_SECRET: process.env.KAELIX_TEST_SESSION_SECRET,
    },
  },
});
