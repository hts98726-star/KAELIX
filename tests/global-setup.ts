import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";

export default async function globalSetup() {
  const url = process.env.KAELIX_TEST_DATABASE_URL!;
  const databasePath = url.slice("file:".length);
  const schemaPath = join(dirname(databasePath), "schema.prisma");
  const schema = readFileSync(resolve("prisma/schema.prisma"), "utf8").replace(
    'url      = "file:./dev.db"',
    `url      = "${url}"`,
  );
  writeFileSync(databasePath, "");
  writeFileSync(schemaPath, schema);
  execFileSync(
    process.execPath,
    [
      resolve("node_modules/prisma/build/index.js"),
      "db",
      "push",
      "--schema",
      schemaPath,
      "--skip-generate",
    ],
    { stdio: "pipe" },
  );
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    await prisma.user.create({
      data: {
        id: randomUUID(),
        email: "checkout@example.test",
        passwordHash: await bcrypt.hash("StrongPass!", 10),
        role: "CUSTOMER",
      },
    });
    await prisma.product.createMany({
      data: [
        {
          id: randomUUID(),
          name: "Pulse Starter",
          type: "SERVICE",
          basePrice: 29.25,
          costPrice: 10,
          markupPrice: 0,
          notes: "A little structure for your next chapter.",
        },
        {
          id: randomUUID(),
          name: "Pulse Professional",
          type: "SERVICE",
          basePrice: 79,
          costPrice: 20,
          variantName: "Priority support",
          markupPrice: 5,
          notes: "More room for a growing business.",
        },
      ],
    });
  } finally {
    await prisma.$disconnect();
  }
}
