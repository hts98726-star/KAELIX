import {
  ArrowDownLeft,
  ArrowUpRight,
  Clock3,
  CreditCard,
  DollarSign,
  FileWarning,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import type { DashboardMetric } from "@/lib/dashboard/types";
import { formatMoney } from "@/lib/commerce/format";

const icons = {
  subscriptions: CreditCard,
  revenue: DollarSign,
  pending: Clock3,
  overdue: FileWarning,
};
const accents = {
  subscriptions: { bg: "bg-violet-50 text-violet-500", line: "#9c85eb" },
  revenue: { bg: "bg-emerald-50 text-emerald-500", line: "#70c9ae" },
  pending: { bg: "bg-amber-50 text-amber-500", line: "#e9bc68" },
  overdue: { bg: "bg-rose-50 text-rose-400", line: "#ec9caa" },
};

export function MetricCards({ metrics }: { metrics: DashboardMetric[] }) {
  return (
    <section
      aria-label="Business metrics"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      {metrics.map((metric) => {
        const Icon = icons[metric.icon];
        const accent = accents[metric.icon];
        return (
          <Card
            key={metric.label}
            className="relative overflow-hidden p-5 transition-shadow hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-medium text-[#80808d]">
                {metric.label}
              </span>
              <span
                className={`flex size-8 items-center justify-center rounded-lg ${accent.bg}`}
              >
                <Icon className="size-4" strokeWidth={1.7} />
              </span>
            </div>
            <div className="mt-3.5 flex items-end justify-between gap-2">
              <p className="text-[29px] leading-none font-semibold tracking-[-1.1px] tabular-nums">
                {metric.format === "currency"
                  ? formatMoney(metric.value)
                  : metric.value.toLocaleString("en-US")}
              </p>
              <svg
                width="91"
                height="36"
                viewBox="0 0 100 50"
                aria-hidden="true"
                className="mb-0.5 opacity-85"
              >
                <polyline
                  points={metric.sparkline
                    .map((n, i) => `${i * 9},${52 - n}`)
                    .join(" ")}
                  fill="none"
                  stroke={accent.line}
                  strokeWidth="2.1"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-1.5 text-[10px]">
              {metric.trend && (
                <span
                  className={`flex items-center gap-0.5 rounded px-1 py-0.5 font-medium ${metric.trend.direction === "down" ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"}`}
                  title="Compared with the previous month"
                >
                  {metric.trend.direction === "down" ? (
                    <ArrowDownLeft className="size-3" />
                  ) : (
                    <ArrowUpRight className="size-3" />
                  )}
                  {metric.trend.value}
                </span>
              )}
              <span className="text-muted-foreground">{metric.detail}</span>
            </div>
          </Card>
        );
      })}
    </section>
  );
}
