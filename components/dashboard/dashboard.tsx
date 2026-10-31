"use client";

import { useState } from "react";
import { CalendarDays, Check, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MetricCards } from "./metric-cards";
import { RevenueChart } from "./revenue-chart";
import { PlanBreakdown } from "./plan-breakdown";
import { SubscriptionsTable } from "./subscriptions-table";
import { SubscriptionForm } from "./subscription-form";
import type { DashboardData, Subscription } from "@/lib/dashboard/types";

export function Dashboard({ data }: { data: DashboardData }) {
  const [subscriptions, setSubscriptions] = useState(data.subscriptions);
  const [created, setCreated] = useState("");
  function create(subscription: Subscription) {
    setSubscriptions((current) => [subscription, ...current]);
    setCreated(
      `${subscription.customer}’s demo subscription was added to this view.`,
    );
  }
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
            Welcome back! Here’s what’s happening with your subscriptions.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 sm:pt-6">
          <span className="flex h-10 items-center gap-2 rounded-lg border bg-white px-3 text-[11px] text-[#6c697a]">
            <CalendarDays className="size-3.5 text-muted-foreground" />
            Oct 1 – Oct 31, 2026
          </span>
          <SubscriptionForm onCreate={create} />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#e9e2fa] bg-[#f4f0fd]/65 px-3.5 py-2.5">
        <p className="flex items-center gap-2 text-[10px] text-[#9384b1]">
          <Sparkles className="size-3.5 shrink-0 text-primary" />
          <span>
            <strong className="font-medium text-[#7d67a8]">
              A preview of your possibilities.
            </strong>{" "}
            You’re viewing sample data for the frontend prototype.
          </span>
        </p>
        <Badge className="px-2 py-0.5 text-[8px] tracking-wide">
          DEMO WORKSPACE
        </Badge>
      </div>
      {created && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-xs text-emerald-700"
        >
          <Check className="size-4 shrink-0" />
          {created}
        </div>
      )}
      <MetricCards metrics={data.metrics} />
      <section
        aria-label="Revenue and plan analytics"
        className="grid gap-5 xl:grid-cols-[minmax(0,1.95fr)_minmax(270px,1fr)]"
      >
        <RevenueChart data={data.revenue} />
        <PlanBreakdown plans={data.plans} />
      </section>
      <SubscriptionsTable subscriptions={subscriptions} />
      <div className="flex items-center justify-center gap-1.5 text-[10px] text-[#a09ba9]">
        <span className="size-1 rounded-full bg-emerald-500" />A clear view
        today. A stronger business tomorrow.
      </div>
    </div>
  );
}
