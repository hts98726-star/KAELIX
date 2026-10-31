import { existsSync, closeSync, openSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const databasePath = fileURLToPath(
  new URL("../prisma/dev.db", import.meta.url),
);
if (!existsSync(databasePath)) closeSync(openSync(databasePath, "wx"));
const cliPath = fileURLToPath(
  new URL("../node_modules/prisma/build/index.js", import.meta.url),
);
const schemaPath = fileURLToPath(
  new URL("../prisma/schema.prisma", import.meta.url),
);
const result = spawnSync(
  process.execPath,
  [cliPath, "db", "push", "--schema", schemaPath, "--skip-generate"],
  { stdio: "inherit" },
);
process.exitCode = result.status ?? 1;
