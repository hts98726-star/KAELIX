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
                // Customers only see confirmed invoices.
                number: `E2E-${planNumber}`,
                dueDate: new Date(Date.now() + 30 * 86400000),
                subTotal: 29.25,
                taxAmount: 2.93,
                discountAmount: 0,
                grandTotal: 32.18,
                status: "CONFIRMED",
              },
            ],
          },
        },
      });
    }
    await seedWorkflowFixtures(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

const DAY = 86400000;
// Isolated records for the dashboard, billing, lifecycle, and reset tests.
async function seedWorkflowFixtures(prisma: PrismaClient) {
  const passwordHash = await bcrypt.hash("StrongPass!", 10);
  const now = Date.now();
  const starter = await prisma.product.findFirstOrThrow({
    where: { name: "Pulse Starter" },
  });
  const plan = await prisma.plan.create({
    data: {
      name: "E2E Plan Monthly",
      productId: starter.id,
      price: 20,
      billingPeriod: "MONTHLY",
      startDate: new Date(now - 365 * DAY),
      closable: false,
    },
  });
  for (const email of [
    "lifecycle@example.test",
    "billing@example.test",
    "reset@example.test",
  ])
    await prisma.user.create({
      data: { email, role: "CUSTOMER", passwordHash },
    });

  // Dashboard: six named customers; nothing here is due for billing.
  const people: [string, string][] = [
    ["Olivia Rhye", "ACTIVE"],
    ["Phoenix Baker", "ACTIVE"],
    ["Alex Morgan", "ACTIVE"],
    ["Natali Craig", "ACTIVE"],
    ["Candice Wu", "ACTIVE"],
    ["Drew Cano", "PAUSED"],
  ];
  for (const [i, [name, status]] of people.entries()) {
    const user = await prisma.user.create({
      data: {
        email: `${name.toLowerCase().replace(" ", ".")}@dashfix.test`,
        name,
        role: "CUSTOMER",
        passwordHash,
      },
    });
    await prisma.subscription.create({
      data: {
        userId: user.id,
        planNumber: `DASH-${String(i + 1).padStart(3, "0")}`,
        billingCycle: "MONTHLY",
        status,
        planId: plan.id,
        startDate: new Date(now - 60 * DAY),
        expiryDate: new Date(now + 300 * DAY),
        nextInvoiceDate: new Date(now + (10 + i) * DAY),
        paymentTerms: "Net 15",
        lines: {
          create: [
            { productId: starter.id, quantity: 1, unitPrice: 20, taxRate: 10 },
          ],
        },
        invoices: {
          create: [
            {
              number: `E2E-DASH-${i + 1}`,
              periodStart: new Date(now - 60 * DAY),
              issueDate: new Date(now - 60 * DAY),
              // The first customer's invoice is unpaid and past due.
              dueDate: new Date(now - 45 * DAY),
              subTotal: 20,
              taxAmount: 2,
              grandTotal: 22,
              status: i === 0 ? "CONFIRMED" : "PAID",
              ...(i > 0 && {
                payments: {
                  create: [
                    {
                      method: "CARD",
                      amount: 22,
                      date: new Date(now - 50 * DAY),
                    },
                  ],
                },
              }),
            },
          ],
        },
      },
    });
  }

  // Billing: a subscription with several missed periods and a one-use discount.
  const seat = await prisma.product.create({
    data: {
      name: "E2E Volume Seat",
      type: "SOFTWARE",
      basePrice: 10,
      costPrice: 1,
    },
  });
  await prisma.discountRule.create({
    data: {
      name: "E2E volume",
      type: "PERCENTAGE",
      value: 10,
      minQuantity: 10,
      usageLimit: 1,
      productId: seat.id,
      startDate: new Date(now - 400 * DAY),
      endDate: new Date(now + 400 * DAY),
    },
  });
  const billing = await prisma.user.findUniqueOrThrow({
    where: { email: "billing@example.test" },
  });
  const start = new Date(now - 95 * DAY);
  await prisma.subscription.create({
    data: {
      userId: billing.id,
      planNumber: "E2E-BILLING-DUE",
      billingCycle: "MONTHLY",
      status: "ACTIVE",
      startDate: start,
      expiryDate: new Date(now + 300 * DAY),
      nextInvoiceDate: start,
      paymentTerms: "Due on Receipt",
      lines: {
        create: [
          { productId: seat.id, quantity: 10, unitPrice: 10, taxRate: 10 },
        ],
      },
    },
  });
}
