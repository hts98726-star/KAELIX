export type SubscriptionStatus =
  | "Draft"
  | "Quotation"
  | "Confirmed"
  | "Active"
  | "Paused"
  | "Closed";
export interface Subscription {
  id: string;
  reference: string;
  customer: string;
  email: string;
  initials: string;
  color: string;
  /** Plan name, or the first product for subscriptions created without a plan. */
  plan: string;
  status: SubscriptionStatus;
  /** ISO date (YYYY-MM-DD) of the next unbilled period, or null when nothing is scheduled. */
  nextBilling: string | null;
  /** Recurring amount per billing period, before tax. */
  amount: number;
  period: string;
}
export interface DashboardMetric {
  label: string;
  value: number;
  format: "number" | "currency";
  icon: "subscriptions" | "revenue" | "pending" | "overdue";
  sparkline: number[];
  detail: string;
  trend?: { value: string; direction: "up" | "down" | "flat" };
}
export interface RevenuePoint {
  month: string;
  year: number;
  /** Payments recorded in the month. */
  collected: number;
  /** Confirmed or paid invoices issued in the month. */
  invoiced: number;
}
export interface PlanBreakdown {
  plan: string;
  count: number;
  color: string;
}
export interface DashboardData {
  periodLabel: string;
  metrics: DashboardMetric[];
  revenue: RevenuePoint[];
  plans: PlanBreakdown[];
  newThisMonth: number;
  subscriptions: Subscription[];
}
