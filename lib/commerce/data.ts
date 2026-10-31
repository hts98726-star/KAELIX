import "server-only";
import { Prisma } from "@prisma/client";
import { authorize } from "@/lib/auth/authorize";
import { OPERATORS } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";
import { defaultTaxRate, taxRateFor } from "@/lib/commerce/engine";
import { money, startOfUtcDay } from "@/lib/commerce/rules";

export async function getCustomers() {
  await authorize(OPERATORS);
  return prisma.user.findMany({
    where: { role: "CUSTOMER" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      _count: { select: { subscriptions: true } },
    },
  });
}
export async function getProducts({ includeArchived = false } = {}) {
  await authorize(OPERATORS);
  const [products, fallback] = await Promise.all([
    prisma.product.findMany({
      where: includeArchived ? {} : { active: true },
      orderBy: [{ active: "desc" }, { name: "asc" }],
      include: {
        taxRule: { select: { name: true, rate: true, active: true } },
        _count: {
          select: {
            variants: { where: { active: true } },
            plans: { where: { active: true } },
          },
        },
      },
    }),
    defaultTaxRate(),
  ]);
  return products.map((product) => ({
    id: product.id,
    name: product.name,
    type: product.type,
    basePrice: product.basePrice,
    costPrice: product.costPrice,
    variantName: product.variantName,
    markupPrice: product.markupPrice,
    notes: product.notes,
    active: product.active,
    taxRuleId: product.taxRuleId,
    taxName: product.taxRule?.active ? product.taxRule.name : null,
    taxRate: taxRateFor(product, fallback),
    variantCount: product._count.variants,
    planCount: product._count.plans,
  }));
}
export async function getSubscriptions() {
  await authorize(OPERATORS);
  return prisma.subscription.findMany({
    orderBy: { startDate: "desc" },
    include: {
      user: { select: { email: true } },
      lines: { include: { product: { select: { name: true } } } },
    },
  });
}
export async function getInvoices() {
  await authorize(OPERATORS);
  return prisma.invoice.findMany({
    orderBy: { issueDate: "desc" },
    include: {
      subscription: {
        select: { planNumber: true, user: { select: { email: true } } },
      },
    },
  });
}

export async function getOwnSubscriptions() {
  const user = await authorize(["CUSTOMER"]);
  return prisma.subscription.findMany({
    where: { userId: user.id },
    orderBy: { startDate: "desc" },
    include: {
      plan: { select: { name: true } },
      lines: { include: { product: { select: { name: true } } } },
    },
  });
}
export async function getOwnInvoices() {
  const user = await authorize(["CUSTOMER"]);
  return prisma.invoice.findMany({
    // Drafts are internal until confirmed.
    where: { subscription: { userId: user.id }, status: { not: "DRAFT" } },
    orderBy: { issueDate: "desc" },
    include: {
      subscription: { select: { planNumber: true } },
      payments: { select: { amount: true } },
    },
  });
}

const PAGE_SIZE = 25;
function pageOf(page: number) {
  const current = Number.isInteger(page) && page > 0 ? page : 1;
  return { skip: (current - 1) * PAGE_SIZE, take: PAGE_SIZE, current };
}
function textFilter(q: string): Prisma.SubscriptionWhereInput[] {
  return [
    { planNumber: { contains: q } },
    { user: { email: { contains: q } } },
    { user: { name: { contains: q } } },
  ];
}

export async function listSubscriptions({
  status = "",
  q = "",
  page = 1,
}: {
  status?: string;
  q?: string;
  page?: number;
}) {
  await authorize(OPERATORS);
  const where: Prisma.SubscriptionWhereInput = {
    ...(status && { status }),
    ...(q && { OR: textFilter(q) }),
  };
  const { skip, take, current } = pageOf(page);
  const [rows, total, counts] = await Promise.all([
    prisma.subscription.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: {
        user: { select: { email: true, name: true } },
        plan: { select: { name: true } },
        lines: { include: { product: { select: { name: true } } } },
      },
    }),
    prisma.subscription.count({ where }),
    prisma.subscription.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  return {
    rows,
    total,
    page: current,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    counts: Object.fromEntries(
      counts.map((c) => [c.status, c._count._all]),
    ) as Record<string, number>,
  };
}

export async function getSubscriptionDetail(id: string) {
  await authorize(OPERATORS);
  return prisma.subscription.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, email: true, name: true } },
      plan: true,
      template: { select: { name: true } },
      lines: {
        include: {
          product: { select: { name: true } },
          variant: { select: { attribute: true, value: true } },
        },
      },
      invoices: {
        orderBy: [{ periodStart: "desc" }, { issueDate: "desc" }],
        include: { payments: { select: { amount: true } } },
      },
    },
  });
}

export async function listInvoices({
  status = "",
  q = "",
  page = 1,
}: {
  status?: string;
  q?: string;
  page?: number;
}) {
  await authorize(OPERATORS);
  const today = startOfUtcDay(new Date());
  const statusWhere: Prisma.InvoiceWhereInput =
    status === "OVERDUE"
      ? { status: "CONFIRMED", dueDate: { lt: today } }
      : status
        ? { status }
        : {};
  const where: Prisma.InvoiceWhereInput = {
    ...statusWhere,
    ...(q && {
      OR: [
        { number: { contains: q } },
        { id: { contains: q } },
        { subscription: { OR: textFilter(q) } },
      ],
    }),
  };
  const { skip, take, current } = pageOf(page);
  const [rows, total, counts, overdue] = await Promise.all([
    prisma.invoice.findMany({
      where,
      orderBy: { issueDate: "desc" },
      skip,
      take,
      include: {
        payments: { select: { amount: true } },
        subscription: {
          select: {
            id: true,
            planNumber: true,
            user: { select: { email: true, name: true } },
          },
        },
      },
    }),
    prisma.invoice.count({ where }),
    prisma.invoice.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.invoice.count({
      where: { status: "CONFIRMED", dueDate: { lt: today } },
    }),
  ]);
  return {
    rows: rows.map((invoice) => ({
      ...invoice,
      paid: money(invoice.payments.reduce((s, p) => s + p.amount, 0)),
    })),
    total,
    page: current,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    counts: {
      ...Object.fromEntries(counts.map((c) => [c.status, c._count._all])),
      OVERDUE: overdue,
    } as Record<string, number>,
  };
}

const invoiceDetail = {
  lines: true,
  payments: { orderBy: { date: "asc" } },
  discountRule: { select: { name: true } },
  subscription: {
    select: {
      id: true,
      planNumber: true,
      paymentTerms: true,
      billingCycle: true,
      user: { select: { id: true, email: true, name: true } },
      lines: {
        include: {
          product: { select: { name: true } },
          variant: { select: { attribute: true, value: true } },
        },
      },
    },
  },
} satisfies Prisma.InvoiceInclude;
export type InvoiceDetail = Prisma.InvoiceGetPayload<{
  include: typeof invoiceDetail;
}>;
export async function getInvoiceDetail(id: string) {
  await authorize(OPERATORS);
  return prisma.invoice.findUnique({ where: { id }, include: invoiceDetail });
}
export async function getOwnInvoiceDetail(id: string) {
  const user = await authorize(["CUSTOMER"]);
  return prisma.invoice.findFirst({
    where: { id, subscription: { userId: user.id }, status: { not: "DRAFT" } },
    include: invoiceDetail,
  });
}

const variantFields = {
  where: { active: true },
  select: { id: true, attribute: true, value: true, extraPrice: true },
} as const;
export async function getNewSubscriptionOptions() {
  await authorize(OPERATORS);
  const [customers, plans, products, templates] = await Promise.all([
    prisma.user.findMany({
      where: { role: "CUSTOMER" },
      orderBy: { email: "asc" },
      select: { id: true, email: true, name: true },
    }),
    prisma.plan.findMany({
      where: {
        active: true,
        product: { active: true },
        OR: [{ endDate: null }, { endDate: { gte: startOfUtcDay(new Date()) } }],
      },
      orderBy: { name: "asc" },
      include: {
        product: { select: { name: true, variants: variantFields } },
      },
    }),
    prisma.product.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        basePrice: true,
        variantName: true,
        markupPrice: true,
        variants: variantFields,
      },
    }),
    prisma.quotationTemplate.findMany({
      where: { active: true, plan: { active: true } },
      orderBy: { name: "asc" },
      include: {
        lines: {
          select: { productId: true, variantId: true, quantity: true },
        },
      },
    }),
  ]);
  return { customers, plans, products, templates };
}

export async function getPlans() {
  await authorize(OPERATORS);
  return prisma.plan.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: {
      product: { select: { name: true } },
      _count: { select: { subscriptions: { where: { status: "ACTIVE" } } } },
    },
  });
}

export async function getProductDetail(id: string) {
  await authorize(OPERATORS);
  return prisma.product.findUnique({
    where: { id },
    include: {
      variants: { orderBy: [{ active: "desc" }, { attribute: "asc" }] },
      plans: {
        select: {
          id: true,
          name: true,
          price: true,
          billingPeriod: true,
          active: true,
        },
      },
      _count: { select: { subscriptionLines: true } },
    },
  });
}

export async function getTaxRules() {
  await authorize(OPERATORS);
  return prisma.taxRule.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, rate: true, isDefault: true },
  });
}

export async function getConfiguration() {
  await authorize(["ADMIN"]);
  const [taxRules, discounts, templates, plans, products] = await Promise.all([
    prisma.taxRule.findMany({
      orderBy: [{ active: "desc" }, { name: "asc" }],
      include: { _count: { select: { products: true } } },
    }),
    prisma.discountRule.findMany({
      orderBy: [{ active: "desc" }, { createdAt: "desc" }],
      include: { product: { select: { name: true } } },
    }),
    prisma.quotationTemplate.findMany({
      orderBy: [{ active: "desc" }, { name: "asc" }],
      include: {
        plan: { select: { name: true } },
        lines: { include: { product: { select: { name: true } } } },
      },
    }),
    prisma.plan.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, minQuantity: true },
    }),
    prisma.product.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  return { taxRules, discounts, templates, plans, products };
}

export async function getTeam() {
  await authorize(["ADMIN"]);
  return prisma.user.findMany({
    where: { role: { in: ["ADMIN", "STAFF"] } },
    orderBy: [{ role: "asc" }, { email: "asc" }],
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });
}
