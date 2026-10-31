import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { LEGACY_TAX_RATE, addPeriod, money } from "./rules";

type Tx = Prisma.TransactionClient;

type PricedProduct = {
  basePrice: number;
  variantName: string | null;
  markupPrice: number;
  taxRule: { rate: number; active: boolean } | null;
};
/** Server-authoritative unit price. A plan price replaces the product's sales price. */
export function unitPriceFor(
  product: PricedProduct,
  options: { planPrice?: number; variantExtra?: number } = {},
) {
  const legacyMarkup =
    options.planPrice === undefined && product.variantName
      ? product.markupPrice
      : 0;
  return money(
    (options.planPrice ?? product.basePrice) +
      legacyMarkup +
      (options.variantExtra ?? 0),
  );
}
export async function defaultTaxRate(tx: Tx = prisma) {
  const rule = await tx.taxRule.findFirst({
    where: { isDefault: true, active: true },
    select: { rate: true },
  });
  return rule?.rate ?? LEGACY_TAX_RATE;
}
export function taxRateFor(product: PricedProduct, fallback: number) {
  return product.taxRule?.active ? product.taxRule.rate : fallback;
}

export type BillableLine = {
  productId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
};
type Rule = {
  id: string;
  type: string;
  value: number;
  minQuantity: number;
  minPurchase: number;
  productId: string | null;
};
export type ComputedInvoice = {
  lines: (BillableLine & {
    discount: number;
    taxAmount: number;
    amount: number;
  })[];
  subTotal: number;
  discountAmount: number;
  taxAmount: number;
  grandTotal: number;
  discountRuleId: string | null;
};

// Split a rounded total across weights so the parts add up exactly.
function allocate(total: number, weights: number[]) {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (!sum) return weights.map(() => 0);
  const parts = weights.map((w) => money((total * w) / sum));
  const drift = money(total - parts.reduce((a, b) => a + b, 0));
  const last = weights.findLastIndex((w) => w > 0);
  parts[last] = money(parts[last] + drift);
  return parts;
}
function ruleDiscount(rule: Rule, lines: BillableLine[]) {
  const scoped = lines.map(
    (line) => rule.productId === null || line.productId === rule.productId,
  );
  const quantity = lines.reduce(
    (sum, line, i) => sum + (scoped[i] ? line.quantity : 0),
    0,
  );
  const purchase = money(
    lines.reduce(
      (sum, line, i) =>
        sum + (scoped[i] ? money(line.quantity * line.unitPrice) : 0),
      0,
    ),
  );
  if (!quantity || quantity < rule.minQuantity || purchase < rule.minPurchase)
    return null;
  const total =
    rule.type === "FIXED"
      ? Math.min(rule.value, purchase)
      : money((purchase * Math.min(rule.value, 100)) / 100);
  return { total: money(total), scoped };
}
/** Applies the single most valuable eligible rule, then taxes the discounted amounts per tax rate. */
export function computeInvoice(
  lines: BillableLine[],
  rules: Rule[],
): ComputedInvoice {
  let best: { rule: Rule; total: number; scoped: boolean[] } | null = null;
  for (const rule of rules) {
    const result = ruleDiscount(rule, lines);
    if (result && result.total > 0 && (!best || result.total > best.total))
      best = { rule, ...result };
  }
  const gross = lines.map((line) => money(line.quantity * line.unitPrice));
  const discounts = best
    ? allocate(
        best.total,
        gross.map((g, i) => (best.scoped[i] ? g : 0)),
      )
    : gross.map(() => 0);
  const net = gross.map((g, i) => money(g - discounts[i]));
  const taxes = new Array<number>(lines.length).fill(0);
  for (const rate of new Set(lines.map((line) => line.taxRate))) {
    const members = lines.map((line) => line.taxRate === rate);
    const groupNet = money(net.reduce((s, n, i) => s + (members[i] ? n : 0), 0));
    const shares = allocate(
      money((groupNet * rate) / 100),
      net.map((n, i) => (members[i] ? n : 0)),
    );
    shares.forEach((share, i) => {
      if (members[i]) taxes[i] = share;
    });
  }
  const subTotal = money(gross.reduce((a, b) => a + b, 0));
  const discountAmount = money(discounts.reduce((a, b) => a + b, 0));
  const taxAmount = money(taxes.reduce((a, b) => a + b, 0));
  return {
    lines: lines.map((line, i) => ({
      ...line,
      discount: discounts[i],
      taxAmount: taxes[i],
      amount: net[i],
    })),
    subTotal,
    discountAmount,
    taxAmount,
    grandTotal: money(subTotal - discountAmount + taxAmount),
    discountRuleId: best?.rule.id ?? null,
  };
}

const subscriptionForBilling = {
  lines: {
    include: {
      product: { select: { name: true } },
      variant: { select: { attribute: true, value: true } },
    },
  },
} satisfies Prisma.SubscriptionInclude;

async function eligibleRules(tx: Tx, now: Date) {
  const rules = await tx.discountRule.findMany({
    where: { active: true, startDate: { lte: now }, endDate: { gte: now } },
  });
  return rules.filter(
    (rule) => rule.usageLimit === null || rule.usedCount < rule.usageLimit,
  );
}

/** Creates the draft invoice for one billing period. The unique (subscription, periodStart) key rejects a second one. */
export async function createPeriodInvoice(
  tx: Tx,
  subscriptionId: string,
  periodStart: Date,
  now = new Date(),
) {
  const subscription = await tx.subscription.findUniqueOrThrow({
    where: { id: subscriptionId },
    include: subscriptionForBilling,
  });
  const lines: BillableLine[] = subscription.lines.map((line) => ({
    productId: line.productId,
    description: line.variant
      ? `${line.product.name} (${line.variant.attribute}: ${line.variant.value})`
      : line.product.name,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    taxRate: line.taxRate ?? LEGACY_TAX_RATE,
  }));
  let rules = await eligibleRules(tx, now);
  let computed = computeInvoice(lines, rules);
  if (computed.discountRuleId) {
    const claimed = await tx.discountRule.updateMany({
      where: {
        id: computed.discountRuleId,
        OR: [
          { usageLimit: null },
          {
            usageLimit: {
              gt: rules.find((r) => r.id === computed.discountRuleId)!
                .usedCount,
            },
          },
        ],
      },
      data: { usedCount: { increment: 1 } },
    });
    if (!claimed.count) {
      rules = rules.filter((r) => r.id !== computed.discountRuleId);
      computed = computeInvoice(lines, rules);
    }
  }
  return tx.invoice.create({
    data: {
      subscriptionId,
      issueDate: now,
      periodStart,
      periodEnd: addPeriod(periodStart, subscription.billingCycle),
      subTotal: computed.subTotal,
      taxAmount: computed.taxAmount,
      discountAmount: computed.discountAmount,
      grandTotal: computed.grandTotal,
      status: "DRAFT",
      discountRuleId: computed.discountRuleId,
      lines: {
        create: computed.lines.map((line) => ({
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          taxRate: line.taxRate,
          discount: line.discount,
          taxAmount: line.taxAmount,
          amount: line.amount,
        })),
      },
    },
  });
}

const MAX_CATCH_UP = 36;
/** Bills every due period of one active subscription. Safe to run repeatedly or concurrently. */
export async function billSubscription(subscriptionId: string, now = new Date()) {
  try {
    return await prisma.$transaction(async (tx) => {
      const subscription = await tx.subscription.findUnique({
        where: { id: subscriptionId },
        select: {
          status: true,
          billingCycle: true,
          expiryDate: true,
          nextInvoiceDate: true,
        },
      });
      if (
        !subscription ||
        subscription.status !== "ACTIVE" ||
        !subscription.nextInvoiceDate
      )
        return 0;
      let next: Date | null = subscription.nextInvoiceDate;
      let created = 0;
      while (next && next <= now && created < MAX_CATCH_UP) {
        if (next >= subscription.expiryDate) {
          next = null;
          break;
        }
        await createPeriodInvoice(tx, subscriptionId, next, now);
        created++;
        next = addPeriod(next, subscription.billingCycle);
      }
      if (next && next >= subscription.expiryDate) next = null;
      // Compare-and-set: a concurrent run that already advanced the date rolls this one back.
      const advanced = await tx.subscription.updateMany({
        where: {
          id: subscriptionId,
          nextInvoiceDate: subscription.nextInvoiceDate,
        },
        data: { nextInvoiceDate: next },
      });
      if (!advanced.count) throw new BillingConflict();
      return created;
    });
  } catch (error) {
    if (
      error instanceof BillingConflict ||
      (error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002")
    )
      return 0;
    throw error;
  }
}
class BillingConflict extends Error {}

/** Billing day: invoice every due subscription and close ended auto-close plans. */
export async function runBilling(now = new Date()) {
  const due = await prisma.subscription.findMany({
    where: { status: "ACTIVE", nextInvoiceDate: { lte: now } },
    select: { id: true },
    orderBy: { nextInvoiceDate: "asc" },
    take: 1000,
  });
  let invoices = 0;
  for (const { id } of due) invoices += await billSubscription(id, now);
  const closed = await prisma.subscription.updateMany({
    where: {
      status: { in: ["ACTIVE", "PAUSED"] },
      expiryDate: { lte: now },
      plan: { autoClose: true },
    },
    data: { status: "CLOSED", closedAt: now, nextInvoiceDate: null },
  });
  return { subscriptions: due.length, invoices, closed: closed.count };
}

export async function nextInvoiceNumber(tx: Tx, now = new Date()) {
  const prefix = `INV/${now.getUTCFullYear()}/`;
  const latest = await tx.invoice.findFirst({
    where: { number: { startsWith: prefix } },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  const sequence = latest?.number
    ? Number(latest.number.slice(prefix.length)) + 1
    : 1;
  return `${prefix}${String(sequence).padStart(5, "0")}`;
}
