export type SubscriptionStatus =
  "Active" | "Trial" | "Pending" | "Overdue" | "Canceled";
export type Plan = "Starter" | "Professional" | "Enterprise";
export interface Subscription {
  id: string;
  customer: string;
  email: string;
  initials: string;
  color: string;
  plan: Plan;
  status: SubscriptionStatus;
  nextBilling: string;
  amount: number;
}
export interface DashboardMetric {
  label: string;
  value: number;
  change: string;
  direction: "up" | "down";
  format: "number" | "currency";
  icon: "subscriptions" | "revenue" | "pending" | "overdue";
  sparkline: number[];
}
export interface RevenuePoint {
  month: string;
  current: number;
  previous: number;
}
export interface PlanBreakdown {
  plan: Plan;
  count: number;
  color: string;
}
export interface DashboardData {
  metrics: DashboardMetric[];
  revenue: RevenuePoint[];
  plans: PlanBreakdown[];
  subscriptions: Subscription[];
}
