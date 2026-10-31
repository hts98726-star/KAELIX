import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import type { PlanBreakdown as PlanBreakdownType } from "@/lib/dashboard/types";

export function PlanBreakdown({
  plans,
  newThisMonth,
}: {
  plans: PlanBreakdownType[];
  newThisMonth: number;
}) {
  const total = plans.reduce((sum, p) => sum + p.count, 0);
  const circumference = 2 * Math.PI * 69;
  return (
    <Card className="flex flex-col p-5 sm:p-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold">Subscriptions by plan</h2>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Active subscriptions by recurring plan.
          </p>
        </div>
        <Link
          href="/subscriptions"
          aria-label="View subscriptions by plan"
          className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-primary"
        >
          <ArrowUpRight className="size-4" />
        </Link>
      </div>
      <div className="relative mx-auto mt-5 mb-4 size-[184px]">
        <svg
          viewBox="0 0 184 184"
          className="size-full -rotate-90"
          role="img"
          aria-label={plans
            .map((p) => `${p.plan}: ${p.count} subscriptions`)
            .join(", ")}
        >
          <circle
            cx="92"
            cy="92"
            r="69"
            fill="none"
            stroke="#f4f0fb"
            strokeWidth="23"
          />
          {total > 0 &&
            plans.map((p, i) => {
              const offset =
                (plans.slice(0, i).reduce((sum, item) => sum + item.count, 0) /
                  total) *
                circumference;
              return (
                <circle
                  key={p.plan}
                  cx="92"
                  cy="92"
                  r="69"
                  fill="none"
                  stroke={p.color}
                  strokeWidth="23"
                  strokeDasharray={`${Math.max(0, (p.count / total) * circumference - 4)} ${circumference}`}
                  strokeDashoffset={-offset}
                />
              );
            })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] text-muted-foreground">
            Total active
          </span>
          <span className="mt-1 text-[27px] font-semibold tracking-tight">
            {total.toLocaleString("en-US")}
          </span>
          <span className="mt-1 flex items-center text-[9px] text-emerald-600">
            {newThisMonth} started this month
          </span>
        </div>
      </div>
      <div className="mt-auto space-y-3.5">
        {plans.length === 0 && (
          <p className="text-center text-[11px] text-muted-foreground">
            No active subscriptions yet.
          </p>
        )}
        {plans.map((p) => (
          <div key={p.plan} className="flex items-center gap-2 text-[11px]">
            <span
              className="size-2 rounded-full"
              style={{ background: p.color }}
            />
            <span className="min-w-0 flex-1 truncate text-[#777483]">
              {p.plan}
            </span>
            <span className="font-medium">{p.count}</span>
            <span className="w-10 text-right text-muted-foreground">
              {total ? Math.round((p.count / total) * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
