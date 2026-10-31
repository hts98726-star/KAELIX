import "server-only";
import { authorize } from "@/lib/auth/authorize";
import { prisma } from "@/lib/prisma";
import { money, startOfUtcDay, titleCase } from "@/lib/commerce/rules";
import type {
  DashboardData,
  DashboardMetric,
  Subscription,
  SubscriptionStatus,
} from "./types";

const avatarColors = ["violet", "blue", "pink", "orange", "green"];
const planColors = ["#8c6be8", "#b9a6f3", "#6fc3ad", "#e9bc68", "#ec9caa", "#9ab8f0"];
const monthName = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });

export function monthStart(date: Date, offset = 0) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + offset, 1));
}
function initials(label: string) {
  return (
    label
      .split(/[\s._@-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "?"
  );
}
function colorFor(id: string) {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return avatarColors[Math.abs(hash) % avatarColors.length];
}
export function displayName(user: { name: string | null; email: string }) {
  return user.name?.trim() || user.email.split("@")[0];
}
// Fits a series into the sparkline's 4–48 drawing band.
function spark(values: number[]) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  return values.map((v) => (max === min ? 24 : 4 + ((v - min) / (max - min)) * 44));
}
function trend(current: number, previous: number): DashboardMetric["trend"] {
  if (!previous) return current ? { value: "New", direction: "up" } : undefined;
  const change = ((current - previous) / previous) * 100;
  return {
    value: `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`,
    direction: change > 0.05 ? "up" : change < -0.05 ? "down" : "flat",
  };
}
function sumBy<T>(rows: T[], from: Date, to: Date, date: (row: T) => Date, value: (row: T) => number) {
  return money(
    rows.reduce((sum, row) => {
      const at = date(row);
      return at >= from && at < to ? sum + value(row) : sum;
    }, 0),
  );
}

/** Outstanding balance of confirmed invoices, and how much of it is overdue. */
export async function receivables(now = new Date()) {
  const today = startOfUtcDay(now);
  const [confirmed, confirmedPaid, overdue, overduePaid] = await Promise.all([
    prisma.invoice.aggregate({
      where: { status: "CONFIRMED" },
      _sum: { grandTotal: true },
      _count: true,
    }),
    prisma.payment.aggregate({
      where: { invoice: { status: "CONFIRMED" } },
      _sum: { amount: true },
    }),
    prisma.invoice.aggregate({
      where: { status: "CONFIRMED", dueDate: { lt: today } },
      _sum: { grandTotal: true },
      _count: true,
    }),
    prisma.payment.aggregate({
      where: { invoice: { status: "CONFIRMED", dueDate: { lt: today } } },
      _sum: { amount: true },
    }),
  ]);
  return {
    outstanding: money((confirmed._sum.grandTotal ?? 0) - (confirmedPaid._sum.amount ?? 0)),
    outstandingCount: confirmed._count,
    overdue: money((overdue._sum.grandTotal ?? 0) - (overduePaid._sum.amount ?? 0)),
    overdueCount: overdue._count,
  };
}

const lifecycleStatuses = new Set(["ACTIVE", "PAUSED", "CLOSED"]);
export async function getDashboardData(now = new Date()): Promise<DashboardData> {
  await authorize(["ADMIN"]);
  const thisMonth = monthStart(now);
  const nextMonth = monthStart(now, 1);
  const since = monthStart(now, -11);
  const [payments, invoices, starts, active, byPlan, recent, owed] = await Promise.all([
    prisma.payment.findMany({
      where: { date: { gte: since } },
      select: { amount: true, date: true },
    }),
    prisma.invoice.findMany({
      where: { status: { in: ["CONFIRMED", "PAID"] }, issueDate: { gte: since } },
      select: { grandTotal: true, issueDate: true },
    }),
    prisma.subscription.findMany({
      where: { status: { in: [...lifecycleStatuses] } },
      select: { startDate: true, closedAt: true, status: true },
    }),
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
    prisma.subscription.groupBy({
      by: ["planId"],
      where: { status: "ACTIVE" },
      _count: { _all: true },
    }),
    prisma.subscription.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: { select: { name: true, email: true } },
        plan: { select: { name: true } },
        lines: {
          select: { quantity: true, unitPrice: true, product: { select: { name: true } } },
        },
      },
    }),
    receivables(now),
  ]);

  const months = Array.from({ length: 12 }, (_, i) => monthStart(now, i - 11));
  const revenue = months.map((from, i) => {
    const to = months[i + 1] ?? nextMonth;
    return {
      month: monthName.format(from),
      year: from.getUTCFullYear(),
      collected: sumBy(payments, from, to, (p) => p.date, (p) => p.amount),
      invoiced: sumBy(invoices, from, to, (i) => i.issueDate, (i) => i.grandTotal),
    };
  });
  // Subscriptions running at each month end (closed ones count until their close date).
  const runningAt = (end: Date) =>
    starts.filter(
      (s) =>
        s.startDate < end &&
        (s.status !== "CLOSED" || (s.closedAt !== null && s.closedAt >= end)),
    ).length;
  const recentMonths = months.slice(-7);
  const runningSeries = recentMonths.map((from, i) =>
    runningAt(recentMonths[i + 1] ?? nextMonth),
  );
  const collectedSeries = revenue.slice(-7).map((point) => point.collected);
  const newThisMonth = starts.filter(
    (s) => s.startDate >= thisMonth && s.startDate < nextMonth,
  ).length;
  const collected = revenue.at(-1)!.collected;

  const planIds = byPlan.flatMap((row) => (row.planId ? [row.planId] : []));
  const plans = await prisma.plan.findMany({
    where: { id: { in: planIds } },
    select: { id: true, name: true },
  });
  const breakdown = byPlan
    .map((row) => ({
      plan: plans.find((p) => p.id === row.planId)?.name ?? "Custom (no plan)",
      count: row._count._all,
    }))
    .sort((a, b) => b.count - a.count);
  const top = breakdown.slice(0, 5);
  const rest = breakdown.slice(5).reduce((sum, row) => sum + row.count, 0);
  if (rest) top.push({ plan: "Other plans", count: rest });

  const subscriptions: Subscription[] = recent.map((s) => {
    const customer = displayName(s.user);
    const firstProduct = s.lines[0]?.product.name ?? "No products";
    return {
      id: s.id,
      reference: s.planNumber,
      customer,
      email: s.user.email,
      initials: initials(customer),
      color: colorFor(s.userId),
      plan:
        s.plan?.name ??
        (s.lines.length > 1 ? `${firstProduct} +${s.lines.length - 1}` : firstProduct),
      status: titleCase(s.status) as SubscriptionStatus,
      nextBilling: s.nextInvoiceDate?.toISOString().slice(0, 10) ?? null,
      amount: money(s.lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0)),
      period: s.billingCycle,
    };
  });

  return {
    periodLabel: `${monthName.format(thisMonth)} 1 – ${monthName.format(thisMonth)} ${new Date(nextMonth.getTime() - 86_400_000).getUTCDate()}, ${thisMonth.getUTCFullYear()}`,
    metrics: [
      {
        label: "Active Subscriptions",
        value: active,
        format: "number",
        icon: "subscriptions",
        sparkline: spark(runningSeries),
        detail: `${newThisMonth} started this month`,
        trend: trend(runningSeries.at(-1)!, runningSeries.at(-2)!),
      },
      {
        label: "Revenue Collected",
        value: collected,
        format: "currency",
        icon: "revenue",
        sparkline: spark(collectedSeries),
        detail: "Payments recorded this month",
        trend: trend(collected, revenue.at(-2)!.collected),
      },
      {
        label: "Outstanding",
        value: owed.outstanding,
        format: "currency",
        icon: "pending",
        sparkline: spark(revenue.slice(-7).map((p) => p.invoiced - p.collected)),
        detail: `${owed.outstandingCount} confirmed invoice${owed.outstandingCount === 1 ? "" : "s"} awaiting payment`,
      },
      {
        label: "Overdue Invoices",
        value: owed.overdueCount,
        format: "number",
        icon: "overdue",
        sparkline: spark([0, 0, 0, 0, 0, 0, owed.overdueCount]),
        detail: `${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(owed.overdue)} past due`,
      },
    ],
    revenue,
    plans: top.map((row, i) => ({ ...row, color: planColors[i % planColors.length] })),
    newThisMonth,
    subscriptions,
  };
}

const monthlyFactor: Record<string, number> = {
  DAILY: 365 / 12,
  WEEKLY: 52 / 12,
  MONTHLY: 1,
  YEARLY: 1 / 12,
};
/** Finance summary for a date range: [from, to) in UTC days. */
export async function getReport(from: Date, to: Date, now = new Date()) {
  await authorize(["ADMIN"]);
  const [
    activeLines,
    activeCount,
    paused,
    started,
    closed,
    invoiced,
    collectedByMethod,
    payments,
    overdueInvoices,
    owed,
  ] = await Promise.all([
    prisma.subscriptionLine.findMany({
      where: { subscription: { status: "ACTIVE" } },
      select: {
        quantity: true,
        unitPrice: true,
        subscription: { select: { billingCycle: true } },
      },
    }),
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
    prisma.subscription.count({ where: { status: "PAUSED" } }),
    prisma.subscription.count({
      where: { startDate: { gte: from, lt: to }, status: { in: ["ACTIVE", "PAUSED", "CLOSED"] } },
    }),
    prisma.subscription.count({ where: { closedAt: { gte: from, lt: to } } }),
    prisma.invoice.aggregate({
      where: { status: { in: ["CONFIRMED", "PAID"] }, issueDate: { gte: from, lt: to } },
      _sum: { grandTotal: true, taxAmount: true, discountAmount: true },
      _count: true,
    }),
    prisma.payment.groupBy({
      by: ["method"],
      where: { date: { gte: from, lt: to } },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.payment.findMany({
      where: { date: { gte: from, lt: to } },
      orderBy: { date: "desc" },
      take: 50,
      include: {
        invoice: {
          select: {
            id: true,
            number: true,
            subscription: { select: { user: { select: { email: true, name: true } } } },
          },
        },
      },
    }),
    prisma.invoice.findMany({
      where: { status: "CONFIRMED", dueDate: { lt: startOfUtcDay(now) } },
      orderBy: { dueDate: "asc" },
      take: 50,
      include: {
        payments: { select: { amount: true } },
        subscription: { select: { planNumber: true, user: { select: { email: true, name: true } } } },
      },
    }),
    receivables(now),
  ]);
  const mrr = money(
    activeLines.reduce(
      (sum, line) =>
        sum + line.quantity * line.unitPrice * (monthlyFactor[line.subscription.billingCycle] ?? 1),
      0,
    ),
  );
  return {
    mrr,
    arr: money(mrr * 12),
    activeCount,
    paused,
    started,
    closed,
    invoiced: {
      total: money(invoiced._sum.grandTotal ?? 0),
      tax: money(invoiced._sum.taxAmount ?? 0),
      discount: money(invoiced._sum.discountAmount ?? 0),
      count: invoiced._count,
    },
    collected: money(collectedByMethod.reduce((s, m) => s + (m._sum.amount ?? 0), 0)),
    byMethod: collectedByMethod.map((m) => ({
      method: m.method,
      amount: money(m._sum.amount ?? 0),
      count: m._count._all,
    })),
    payments,
    overdueInvoices: overdueInvoices.map((invoice) => ({
      ...invoice,
      balance: money(invoice.grandTotal - invoice.payments.reduce((s, p) => s + p.amount, 0)),
    })),
    ...owed,
  };
}
