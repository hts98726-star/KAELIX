// Adds a Brightloop Software demo dataset to the local database.
// Additive and idempotent: it never deletes or edits existing records, backs up
// the SQLite file first, and refuses to run twice. No ADMIN/STAFF accounts are created.
//
// Demo customers can log in only when KAELIX_DEMO_PASSWORD is set (a password that
// meets the signup rules); otherwise they receive an unusable random password.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const DOMAIN = "@demo.brightloop.test";
const dbFile = fileURLToPath(new URL("../prisma/dev.db", import.meta.url));
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL ?? "file:./dev.db" } },
});

// Deterministic randomness so every teammate gets the same story.
let seed = 20261031;
const rand = () => ((seed = (seed * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32);
const pick = (list) => list[Math.floor(rand() * list.length)];
const money = (v) => Math.round((v + Number.EPSILON) * 100) / 100;
const DAY = 86_400_000;
const addDays = (d, n) => new Date(d.getTime() + n * DAY);
function addPeriod(start, period, count = 1) {
  if (period === "DAILY") return addDays(start, count);
  if (period === "WEEKLY") return addDays(start, 7 * count);
  const months = period === "YEARLY" ? 12 * count : count;
  const t = new Date(start);
  t.setUTCDate(1);
  t.setUTCMonth(t.getUTCMonth() + months);
  const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
  t.setUTCDate(Math.min(start.getUTCDate(), last));
  return t;
}
const utcDay = (d) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
const terms = { "Due on Receipt": 0, "Net 7": 7, "Net 15": 15, "Net 30": 30 };

// Same arithmetic as lib/commerce/engine.ts computeInvoice (single rule, tax per rate).
function allocate(total, weights) {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (!sum) return weights.map(() => 0);
  const parts = weights.map((w) => money((total * w) / sum));
  const drift = money(total - parts.reduce((a, b) => a + b, 0));
  const last = weights.findLastIndex((w) => w > 0);
  parts[last] = money(parts[last] + drift);
  return parts;
}
function computeInvoice(lines, discountPct) {
  const gross = lines.map((l) => money(l.quantity * l.unitPrice));
  const discountTotal = discountPct ? money((gross.reduce((a, b) => a + b, 0) * discountPct) / 100) : 0;
  const discounts = allocate(discountTotal, gross);
  const net = gross.map((g, i) => money(g - discounts[i]));
  const taxes = new Array(lines.length).fill(0);
  for (const rate of new Set(lines.map((l) => l.taxRate))) {
    const m = lines.map((l) => l.taxRate === rate);
    const groupNet = money(net.reduce((s, n, i) => s + (m[i] ? n : 0), 0));
    allocate(money((groupNet * rate) / 100), net.map((n, i) => (m[i] ? n : 0))).forEach((t, i) => {
      if (m[i]) taxes[i] = t;
    });
  }
  const subTotal = money(gross.reduce((a, b) => a + b, 0));
  const discountAmount = money(discounts.reduce((a, b) => a + b, 0));
  const taxAmount = money(taxes.reduce((a, b) => a + b, 0));
  return {
    subTotal,
    discountAmount,
    taxAmount,
    grandTotal: money(subTotal - discountAmount + taxAmount),
    lines: lines.map((l, i) => ({
      description: l.description,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      taxRate: l.taxRate,
      discount: discounts[i],
      taxAmount: taxes[i],
      amount: net[i],
    })),
  };
}

async function main() {
  if (await prisma.user.findFirst({ where: { email: { endsWith: DOMAIN } } })) {
    // Re-run with KAELIX_DEMO_PASSWORD to enable portal logins for demo customers only.
    if (process.env.KAELIX_DEMO_PASSWORD) {
      const updated = await prisma.user.updateMany({
        where: { email: { endsWith: DOMAIN }, role: "CUSTOMER" },
        data: { passwordHash: await bcrypt.hash(process.env.KAELIX_DEMO_PASSWORD, 10) },
      });
      console.log(`Demo data already present. Updated the password of ${updated.count} demo customers.`);
    } else console.log("Demo data is already present. Nothing was changed.");
    return;
  }
  if (!process.env.DATABASE_URL && existsSync(dbFile)) {
    const dir = fileURLToPath(new URL("../prisma/backups/", import.meta.url));
    mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    copyFileSync(dbFile, `${dir}dev-${stamp}-pre-demo-seed.db`);
    console.log("Backed up prisma/dev.db to prisma/backups/.");
  }
  const demoPassword = process.env.KAELIX_DEMO_PASSWORD;
  if (
    demoPassword &&
    !(demoPassword.length > 8 && /[a-z]/.test(demoPassword) && /[A-Z]/.test(demoPassword) && /[^a-zA-Z0-9]/.test(demoPassword))
  )
    throw new Error("KAELIX_DEMO_PASSWORD must meet the signup password rules.");
  const passwordHash = await bcrypt.hash(demoPassword ?? randomBytes(24).toString("base64url"), 10);
  const now = new Date();
  const today = utcDay(now);

  // Taxes: keep an existing default if the workspace already has one.
  const hasDefault = await prisma.taxRule.findFirst({ where: { isDefault: true, active: true } });
  const standard = await prisma.taxRule.create({ data: { name: "Standard tax", rate: 10, isDefault: !hasDefault } });
  const reduced = await prisma.taxRule.create({ data: { name: "Reduced tax", rate: 5 } });
  const zero = await prisma.taxRule.create({ data: { name: "Zero-rated services", rate: 0 } });

  const product = (data) => prisma.product.create({ data: { markupPrice: 0, ...data } });
  const crm = await product({ name: "Brightloop CRM", type: "SOFTWARE", basePrice: 49, costPrice: 12, taxRuleId: standard.id, notes: "Pipeline, contacts, and email sequences for growing teams." });
  const erp = await product({ name: "Brightloop ERP Suite", type: "SOFTWARE", basePrice: 1200, costPrice: 320, taxRuleId: standard.id, notes: "Accounting, inventory, and purchasing. Licensed per seat." });
  const analytics = await product({ name: "Insights Analytics", type: "ADD_ON", basePrice: 19, costPrice: 4, taxRuleId: standard.id, notes: "Dashboards and scheduled reports." });
  const storage = await product({ name: "Extra Storage 100 GB", type: "ADD_ON", basePrice: 9, costPrice: 2, taxRuleId: reduced.id });
  const support = await product({ name: "Priority Support", type: "SERVICE", basePrice: 99, costPrice: 40, taxRuleId: standard.id, notes: "Four-hour response, named engineer." });
  const onboarding = await product({ name: "Onboarding Workshop", type: "SERVICE", basePrice: 250, costPrice: 90, taxRuleId: zero.id });
  const odoo = await prisma.productVariant.create({ data: { productId: erp.id, attribute: "Brand", value: "Odoo", extraPrice: 560 } });
  await prisma.productVariant.create({ data: { productId: erp.id, attribute: "Brand", value: "Brightloop", extraPrice: 0 } });
  const crmPlus = await prisma.productVariant.create({ data: { productId: crm.id, attribute: "Edition", value: "Plus", extraPrice: 20 } });

  const since = new Date(Date.UTC(now.getUTCFullYear() - 1, 0, 1));
  const plan = (data) => prisma.plan.create({ data: { startDate: since, ...data } });
  const crmMonthly = await plan({ name: "CRM Monthly", productId: crm.id, price: 49, billingPeriod: "MONTHLY" });
  const crmYearly = await plan({ name: "CRM Yearly", productId: crm.id, price: 490, billingPeriod: "YEARLY", pausable: false });
  const erpAnnual = await plan({ name: "ERP Annual (per seat)", productId: erp.id, price: 1200, billingPeriod: "YEARLY", minQuantity: 5, autoClose: true, pausable: false, closable: false });
  const erpMonthly = await plan({ name: "ERP Monthly (per seat)", productId: erp.id, price: 120, billingPeriod: "MONTHLY", minQuantity: 3 });
  const analyticsWeekly = await plan({ name: "Analytics Weekly", productId: analytics.id, price: 5, billingPeriod: "WEEKLY" });
  const supportMonthly = await plan({ name: "Support Monthly", productId: support.id, price: 99, billingPeriod: "MONTHLY", renewable: true });
  await plan({ name: "Summer CRM Promo", productId: crm.id, price: 39, billingPeriod: "MONTHLY", endDate: new Date(Date.UTC(now.getUTCFullYear(), 7, 31)), active: false });

  const volume = await prisma.discountRule.create({
    data: { name: "Volume 10+ seats", type: "PERCENTAGE", value: 10, minQuantity: 10, startDate: since, endDate: addDays(today, 365) },
  });
  await prisma.discountRule.create({
    data: { name: "Launch credit", type: "FIXED", value: 50, minPurchase: 500, usageLimit: 20, startDate: addDays(today, -30), endDate: addDays(today, 60) },
  });
  await prisma.discountRule.create({
    data: { name: "Summer 2026", type: "PERCENTAGE", value: 15, startDate: new Date(Date.UTC(now.getUTCFullYear(), 5, 1)), endDate: new Date(Date.UTC(now.getUTCFullYear(), 7, 31, 23, 59, 59)) },
  });
  await prisma.quotationTemplate.create({
    data: {
      name: "Enterprise ERP rollout", validityDays: 30, planId: erpAnnual.id, planQuantity: 10, paymentTerms: "Net 30",
      notes: "Annual ERP licence with analytics and priority support.",
      lines: { create: [{ productId: analytics.id, quantity: 10 }, { productId: support.id, quantity: 1 }] },
    },
  });
  await prisma.quotationTemplate.create({
    data: {
      name: "CRM starter team", validityDays: 14, planId: crmMonthly.id, planQuantity: 3, paymentTerms: "Net 15",
      lines: { create: [{ productId: storage.id, quantity: 2 }] },
    },
  });

  const names = ["Olivia Rhye", "Phoenix Baker", "Lana Steiner", "Demi Wilkinson", "Candice Wu", "Natali Craig", "Drew Cano", "Orlando Diggs", "Andi Lane", "Kate Morrison", "Koray Okumus", "Ava Wright", "Eve Leroy", "Zahir Mays", "Joshua Wilson", "Lori Bryson", "Mollie Hall", "Sienna Hewitt", "Rene Wells", "Owen Garcia", "Priya Nair", "Arjun Menon", "Meera Pillai", "Rahul Varma"];
  const companies = ["Northwind", "Contoso", "Fabrikam", "Lumen", "Tidewater", "Kochi Spice Co", "Harbor Labs", "Bluepeak", "Quanta", "Evergreen"];
  const customers = [];
  for (const [i, name] of names.entries()) {
    const email = `${name.toLowerCase().replace(/\s+/g, ".")}${DOMAIN}`;
    customers.push(
      await prisma.user.create({
        data: { email, name: `${name} (${companies[i % companies.length]})`, role: "CUSTOMER", passwordHash, createdAt: addDays(today, -300 + i * 9) },
      }),
    );
  }

  const taxOf = { [crm.id]: 10, [erp.id]: 10, [analytics.id]: 10, [storage.id]: 5, [support.id]: 10, [onboarding.id]: 0 };
  const nameOf = { [crm.id]: crm.name, [erp.id]: erp.name, [analytics.id]: analytics.name, [storage.id]: storage.name, [support.id]: support.name, [onboarding.id]: onboarding.name };
  const prefixMax = {};
  async function nextNumber(year) {
    if (prefixMax[year] === undefined) {
      const latest = await prisma.invoice.findFirst({ where: { number: { startsWith: `INV/${year}/` } }, orderBy: { number: "desc" } });
      prefixMax[year] = latest?.number ? Number(latest.number.split("/")[2]) : 0;
    }
    return `INV/${year}/${String(++prefixMax[year]).padStart(5, "0")}`;
  }
  let reference = 0;
  const latestRef = await prisma.subscription.findFirst({ where: { planNumber: { startsWith: "SUB-" } }, orderBy: { planNumber: "desc" } });
  if (latestRef) reference = Number(latestRef.planNumber.slice(4)) || 0;

  // [customer, plan, planQty, variant, addOns, startOffsetDays, status, terms]
  const scenarios = [
    [0, crmMonthly, 5, null, [[analytics, 5]], -270, "ACTIVE", "Net 15"],
    [1, crmMonthly, 2, crmPlus, [], -240, "ACTIVE", "Due on Receipt"],
    [2, erpMonthly, 12, odoo, [[support, 1]], -210, "ACTIVE", "Net 30"],
    [3, crmYearly, 3, null, [], -330, "ACTIVE", "Net 30"],
    [4, supportMonthly, 1, null, [[storage, 3]], -190, "ACTIVE", "Net 7"],
    [5, crmMonthly, 8, null, [[analytics, 8], [storage, 4]], -160, "ACTIVE", "Net 15"],
    [6, erpAnnual, 10, null, [[analytics, 10]], -120, "ACTIVE", "Net 30"],
    [7, analyticsWeekly, 4, null, [], -63, "ACTIVE", "Due on Receipt"],
    [8, crmMonthly, 1, null, [], -130, "ACTIVE", "Net 15"],
    [9, erpMonthly, 4, null, [], -100, "ACTIVE", "Net 30"],
    [10, crmMonthly, 15, crmPlus, [[support, 1]], -95, "ACTIVE", "Net 30"],
    [11, supportMonthly, 1, null, [], -80, "ACTIVE", "Net 7"],
    [12, crmMonthly, 3, null, [[storage, 2]], -45, "ACTIVE", "Net 15"],
    [13, erpMonthly, 6, odoo, [], -40, "ACTIVE", "Net 30"],
    [14, crmMonthly, 2, null, [], -20, "ACTIVE", "Due on Receipt"],
    [15, crmMonthly, 4, null, [[analytics, 4]], -8, "ACTIVE", "Net 15"],
    [16, crmMonthly, 2, null, [], -200, "PAUSED", "Net 15"],
    [17, supportMonthly, 1, null, [], -150, "PAUSED", "Net 7"],
    [18, crmMonthly, 3, null, [], -260, "CLOSED", "Net 15"],
    [19, erpMonthly, 3, null, [], -220, "CLOSED", "Net 30"],
    [20, erpAnnual, 10, odoo, [[analytics, 10], [support, 1]], 3, "QUOTATION", "Net 30"],
    [21, crmMonthly, 3, null, [[storage, 2]], -25, "QUOTATION", "Net 15"],
    [22, crmYearly, 5, null, [[onboarding, 1]], 7, "CONFIRMED", "Net 30"],
    [23, crmMonthly, 2, null, [], 0, "DRAFT", "Due on Receipt"],
  ];
  let invoiceCount = 0;
  let paymentCount = 0;
  for (const [ci, p, qty, variant, addOns, offset, status, payTerms] of scenarios) {
    const customer = customers[ci];
    const startDate = addDays(today, offset);
    const unit = money(p.price + (variant?.extraPrice ?? 0));
    const lines = [
      { productId: p.productId, variantId: variant?.id ?? null, quantity: qty, unitPrice: unit, taxRate: taxOf[p.productId], description: variant ? `${nameOf[p.productId]} (${variant.attribute}: ${variant.value})` : nameOf[p.productId] },
      ...addOns.map(([prod, q]) => ({ productId: prod.id, variantId: null, quantity: q, unitPrice: prod.basePrice, taxRate: taxOf[prod.id], description: prod.name })),
    ];
    const closedAt = status === "CLOSED" ? addDays(today, -35 - Math.floor(rand() * 40)) : null;
    const pausedAt = status === "PAUSED" ? addDays(today, -50) : null;
    const billable = ["ACTIVE", "PAUSED", "CLOSED"].includes(status);
    const expiryDate = addPeriod(startDate, "YEARLY", p.billingPeriod === "YEARLY" ? 1 : 1);
    const sub = await prisma.subscription.create({
      data: {
        userId: customer.id,
        planNumber: `SUB-${String(++reference).padStart(5, "0")}`,
        billingCycle: p.billingPeriod,
        status,
        startDate,
        expiryDate,
        paymentTerms: payTerms,
        planId: p.id,
        createdAt: addDays(startDate, -3),
        validUntil: status === "QUOTATION" ? addDays(today, offset > 0 ? 27 : -5) : null,
        closedAt,
        notes: status === "QUOTATION" && offset <= 0 ? "Customer went quiet; quotation expired." : null,
        lines: {
          create: lines.map((l) => ({
            productId: l.productId,
            variantId: l.variantId,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            taxRate: l.taxRate,
          })),
        },
      },
    });
    if (!billable) continue;
    // Bill every elapsed period up to today (or the close/pause date).
    const stop = closedAt ?? pausedAt ?? now;
    let periodStart = startDate;
    while (periodStart <= stop && periodStart < expiryDate) {
      const discountPct = qty >= 10 ? volume.value : 0;
      const computed = computeInvoice(lines, discountPct);
      const ageDays = (today - periodStart) / DAY;
      const issueDate = periodStart;
      const dueDate = addDays(utcDay(issueDate), terms[payTerms]);
      // Recent periods are drafts or awaiting payment; older ones are mostly paid.
      let invStatus = "PAID";
      if (ageDays < 3) invStatus = "DRAFT";
      else if (dueDate >= today) invStatus = rand() < 0.3 ? "PAID" : "CONFIRMED";
      else if (rand() < 0.14) invStatus = "CONFIRMED"; // overdue
      const invoice = await prisma.invoice.create({
        data: {
          subscriptionId: sub.id,
          number: invStatus === "DRAFT" ? null : await nextNumber(issueDate.getUTCFullYear()),
          issueDate,
          dueDate: invStatus === "DRAFT" ? null : dueDate,
          confirmedAt: invStatus === "DRAFT" ? null : issueDate,
          sentAt: invStatus === "DRAFT" ? null : addDays(issueDate, 0),
          periodStart,
          periodEnd: addPeriod(periodStart, p.billingPeriod),
          subTotal: computed.subTotal,
          taxAmount: computed.taxAmount,
          discountAmount: computed.discountAmount,
          grandTotal: computed.grandTotal,
          status: invStatus,
          discountRuleId: discountPct ? volume.id : null,
          lines: { create: computed.lines },
        },
      });
      invoiceCount++;
      if (discountPct) await prisma.discountRule.update({ where: { id: volume.id }, data: { usedCount: { increment: 1 } } });
      const method = pick(["BANK_TRANSFER", "BANK_TRANSFER", "CARD", "CARD", "ONLINE", "CHEQUE", "CASH"]);
      const paidOn = (days) => {
        const d = addDays(issueDate, days);
        return d > now ? now : d;
      };
      if (invStatus === "PAID") {
        await prisma.payment.create({ data: { invoiceId: invoice.id, method, amount: computed.grandTotal, date: paidOn(1 + Math.floor(rand() * Math.max(1, terms[payTerms] || 3))), note: method === "BANK_TRANSFER" ? `Bank ref BL${Math.floor(rand() * 90000 + 10000)}` : null } });
        paymentCount++;
      } else if (invStatus === "CONFIRMED" && rand() < 0.35) {
        await prisma.payment.create({ data: { invoiceId: invoice.id, method, amount: money(computed.grandTotal * 0.4), date: paidOn(2), note: "Partial payment" } });
        paymentCount++;
      }
      periodStart = addPeriod(periodStart, p.billingPeriod);
    }
    if (status === "ACTIVE")
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { nextInvoiceDate: periodStart < expiryDate ? periodStart : null },
      });
  }
  console.log(
    `Demo data added: ${customers.length} customers, 6 products, 7 plans, 3 tax rules, 3 discounts, 2 templates, ${scenarios.length} subscriptions, ${invoiceCount} invoices, ${paymentCount} payments.`,
  );
  console.log(
    demoPassword
      ? `Demo customers (…${DOMAIN}) can log in with KAELIX_DEMO_PASSWORD.`
      : `Demo customers have unusable passwords. Re-run with KAELIX_DEMO_PASSWORD set to enable their portal logins.`,
  );
}
main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
