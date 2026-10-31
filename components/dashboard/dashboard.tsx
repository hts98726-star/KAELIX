import Link from "next/link";
import { BarChart3, CalendarDays, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MetricCards } from "./metric-cards";
import { RevenueChart } from "./revenue-chart";
import { PlanBreakdown } from "./plan-breakdown";
import { SubscriptionsTable } from "./subscriptions-table";
import type { DashboardData } from "@/lib/dashboard/types";

export function Dashboard({ data }: { data: DashboardData }) {
  return (
    <div className="page-enter space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2.5 flex items-center gap-2 text-[10px] font-medium text-muted-foreground">
            <span className="size-1.5 rounded-full bg-primary" /> YOUR BUSINESS,
            IN RHYTHM
          </div>
          <h1 className="text-[27px] leading-tight font-semibold tracking-[-1px] sm:text-[29px]">
            Dashboard overview<span className="text-primary">.</span>
          </h1>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Live subscriptions, invoices, and payments from your workspace.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 sm:pt-6">
          <span className="flex h-10 items-center gap-2 rounded-lg border bg-white px-3 text-[11px] text-[#6c697a]">
            <CalendarDays className="size-3.5 text-muted-foreground" />
            {data.periodLabel}
          </span>
          <Button asChild variant="outline">
            <Link href="/reports">
              <BarChart3 />
              Reports
            </Link>
          </Button>
          <Button asChild>
            <Link href="/subscriptions/new">
              <Plus />
              New subscription
            </Link>
          </Button>
        </div>
      </div>
      <MetricCards metrics={data.metrics} />
      <section
        aria-label="Revenue and plan analytics"
        className="grid gap-5 xl:grid-cols-[minmax(0,1.95fr)_minmax(270px,1fr)]"
      >
        <RevenueChart data={data.revenue} />
        <PlanBreakdown plans={data.plans} newThisMonth={data.newThisMonth} />
      </section>
      <SubscriptionsTable subscriptions={data.subscriptions} />
      <div className="flex items-center justify-center gap-1.5 text-[10px] text-[#a09ba9]">
        <span className="size-1 rounded-full bg-emerald-500" />A clear view
        today. A stronger business tomorrow.
      </div>
    </div>
  );
}
