// Business rules shared by server actions, the billing engine, and the UI.
// Keep this file free of server-only imports.

export const BILLING_PERIODS = ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"] as const;
export type BillingPeriod = (typeof BILLING_PERIODS)[number];

export const SUBSCRIPTION_STATUSES = [
  "DRAFT",
  "QUOTATION",
  "CONFIRMED",
  "ACTIVE",
  "PAUSED",
  "CLOSED",
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const INVOICE_STATUSES = [
  "DRAFT",
  "CONFIRMED",
  "PAID",
  "CANCELLED",
] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const PAYMENT_METHODS = [
  "BANK_TRANSFER",
  "CARD",
  "CASH",
  "CHEQUE",
  "ONLINE",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PRODUCT_TYPES = ["SERVICE", "SOFTWARE", "ADD_ON", "GOODS"] as const;

// Payment terms decide an invoice's due date, counted from confirmation.
export const PAYMENT_TERMS: Record<string, number> = {
  "Due on Receipt": 0,
  "Net 7": 7,
  "Net 15": 15,
  "Net 30": 30,
  "Net 60": 60,
};
export function termDays(terms: string) {
  return PAYMENT_TERMS[terms] ?? 0;
}

// Legacy lines (created before tax rules existed) were taxed by the 10% engine default.
export const LEGACY_TAX_RATE = 10;

export const money = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const DAY = 86_400_000;
export function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY);
}
/** End of the billing period starting at `start` (exclusive). Month ends clamp, e.g. Jan 31 → Feb 28. */
export function addPeriod(start: Date, period: string, count = 1) {
  if (period === "DAILY") return addDays(start, count);
  if (period === "WEEKLY") return addDays(start, 7 * count);
  const months = period === "YEARLY" ? 12 * count : count;
  const target = new Date(start);
  target.setUTCDate(1);
  target.setUTCMonth(target.getUTCMonth() + months);
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(start.getUTCDate(), lastDay));
  return target;
}
export function startOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}
/** An unpaid confirmed invoice becomes overdue the day after its due date. */
export function isOverdue(
  invoice: { status: string; dueDate: Date | null },
  now = new Date(),
) {
  return (
    invoice.status === "CONFIRMED" &&
    invoice.dueDate !== null &&
    invoice.dueDate < startOfUtcDay(now)
  );
}
export const periodLabel: Record<string, string> = {
  DAILY: "day",
  WEEKLY: "wk",
  MONTHLY: "mo",
  YEARLY: "yr",
};

export type LifecycleAction =
  | "send_quotation"
  | "confirm"
  | "activate"
  | "pause"
  | "resume"
  | "renew"
  | "close";
type PlanRules = {
  closable: boolean;
  pausable: boolean;
  renewable: boolean;
} | null;

const transitions: Record<string, Partial<Record<LifecycleAction, string>>> = {
  DRAFT: { send_quotation: "QUOTATION", confirm: "CONFIRMED", close: "CLOSED" },
  QUOTATION: { confirm: "CONFIRMED", close: "CLOSED" },
  CONFIRMED: { activate: "ACTIVE", close: "CLOSED" },
  ACTIVE: { pause: "PAUSED", renew: "ACTIVE", close: "CLOSED" },
  PAUSED: { resume: "ACTIVE", close: "CLOSED" },
  CLOSED: {},
};
/** Lifecycle actions available for a subscription; plan flags restrict pause, close, and renew. */
export function allowedActions(status: string, plan: PlanRules) {
  return (Object.keys(transitions[status] ?? {}) as LifecycleAction[]).filter(
    (action) => {
      if (!plan) return true;
      // Draft and quotation records can always be discarded.
      if (action === "close" && (status === "ACTIVE" || status === "PAUSED"))
        return plan.closable;
      if (action === "pause") return plan.pausable;
      if (action === "renew") return plan.renewable;
      return true;
    },
  );
}
export function nextStatus(status: string, action: LifecycleAction) {
  return transitions[status]?.[action];
}
export const actionLabels: Record<LifecycleAction, string> = {
  send_quotation: "Send quotation",
  confirm: "Confirm",
  activate: "Start subscription",
  pause: "Pause",
  resume: "Resume",
  renew: "Renew",
  close: "Close",
};
export function titleCase(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
