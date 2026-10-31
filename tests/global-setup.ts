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
    for (const [email, role] of [
      ["admin@example.test", "ADMIN"],
      ["staff@example.test", "STAFF"],
      ["other@example.test", "CUSTOMER"],
    ]) {
      await prisma.user.create({
        data: {
          email,
          role,
          passwordHash: await bcrypt.hash("StrongPass!", 10),
        },
      });
    }
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
    const product = await prisma.product.findFirstOrThrow({
      where: { name: "Pulse Starter" },
    });
    for (const [email, planNumber] of [
      ["checkout@example.test", "E2E-OWN-CUSTOMER"],
      ["other@example.test", "E2E-OTHER-CUSTOMER"],
    ]) {
      const user = await prisma.user.findUniqueOrThrow({ where: { email } });
      await prisma.subscription.create({
        data: {
          userId: user.id,
          planNumber,
          billingCycle: "MONTHLY",
          status: "ACTIVE",
          startDate: new Date(),
          expiryDate: new Date(Date.now() + 30 * 86400000),
          paymentTerms: "Due on Receipt",
          lines: {
            create: [{ productId: product.id, quantity: 1, unitPrice: 29.25 }],
          },
          invoices: {
            create: [
              {
                subTotal: 29.25,
                taxAmount: 2.93,
                discountAmount: 0,
                grandTotal: 32.18,
                status: "DRAFT",
              },
            ],
          },
        },
      });
    }
  } finally {
    await prisma.$disconnect();
  }
}
