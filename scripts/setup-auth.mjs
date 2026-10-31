import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const envPath = fileURLToPath(new URL("../.env", import.meta.url));
const existing = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
if (process.env.SESSION_SECRET || /^SESSION_SECRET=/m.test(existing)) {
  console.log("Existing session secret retained.");
} else {
  appendFileSync(
    envPath,
    `\nSESSION_SECRET=${randomBytes(48).toString("base64url")}\n`,
    { mode: 0o600 },
  );
  console.log(
    "Generated a local session secret in the ignored .env file. No secret was printed.",
  );
}
