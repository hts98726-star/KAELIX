"use client";

import { useId, useState } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RevenuePoint } from "@/lib/dashboard/types";
import { formatMoney } from "@/lib/commerce/format";
import { cn } from "@/lib/utils";

// Round the axis up to a readable step (1, 2, 5 × 10ⁿ).
function niceMax(value: number) {
  if (value <= 0) return 100;
  const step = 10 ** Math.floor(Math.log10(value));
  return [1, 2, 5, 10].map((m) => m * step).find((n) => n >= value)!;
}
function axisLabel(value: number) {
  return value >= 1000
    ? `$${(value / 1000).toFixed(value >= 10_000 ? 0 : 1)}k`
    : `$${Math.round(value)}`;
}

export function RevenueChart({ data }: { data: RevenuePoint[] }) {
  const id = useId();
  const [range, setRange] = useState("6");
  const [hover, setHover] = useState<number | null>(null);
  const [showInvoiced, setShowInvoiced] = useState(true);
  const points = data.slice(-Number(range));
  const last = points.at(-1);
  const previous = points.at(-2);
  const change =
    last && previous && previous.collected
      ? ((last.collected - previous.collected) / previous.collected) * 100
      : null;
  const max = niceMax(
    Math.max(...points.map((p) => Math.max(p.collected, p.invoiced))),
  );
  const x = (index: number) =>
    48 + (index / Math.max(1, points.length - 1)) * 642;
  const y = (n: number) => 202 - (n / max) * 180;
  const collectedLine = points
    .map((p, i) => `${x(i)},${y(p.collected)}`)
    .join(" ");
  const invoicedLine = points
    .map((p, i) => `${x(i)},${y(p.invoiced)}`)
    .join(" ");

  return (
    <Card className="min-w-0 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Revenue overview</h2>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Payments collected against invoices issued, by month.
          </p>
        </div>
        <Select
          value={range}
          onValueChange={(value) => {
            setRange(value);
            setHover(null);
          }}
        >
          <SelectTrigger
            className="h-8 gap-2 px-2.5 text-[10px]"
            aria-label="Revenue chart date range"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="12">Last 12 months</SelectItem>
            <SelectItem value="6">Last 6 months</SelectItem>
            <SelectItem value="3">Last 3 months</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        <span className="text-[28px] leading-none font-semibold tracking-[-1px]">
          {formatMoney(last?.collected ?? 0)}
        </span>
        {change !== null && (
          <span
            className={cn(
              "flex items-center gap-0.5 rounded-md px-1.5 py-1 text-[10px] font-medium",
              change < 0
                ? "bg-rose-50 text-rose-600"
                : "bg-emerald-50 text-emerald-600",
            )}
          >
            {change < 0 ? (
              <TrendingDown className="size-3" />
            ) : (
              <TrendingUp className="size-3" />
            )}
            {change.toFixed(1)}%
          </span>
        )}
        <span className="text-[10px] text-muted-foreground">
          collected this month{change !== null && " vs. previous month"}
        </span>
      </div>
      <div className="relative mt-5">
        <svg
          viewBox="0 0 720 236"
          className="block w-full overflow-visible"
          role="img"
          aria-labelledby={`${id}-title ${id}-desc`}
          onMouseLeave={() => setHover(null)}
        >
          <title id={`${id}-title`}>Monthly revenue comparison</title>
          <desc id={`${id}-desc`}>
            {points
              .map(
                (p) =>
                  `${p.month} ${p.year}: collected ${formatMoney(p.collected)}, invoiced ${formatMoney(p.invoiced)}`,
              )
              .join(". ")}
          </desc>
          <defs>
            <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a18aee" stopOpacity=".2" />
              <stop offset="100%" stopColor="#a18aee" stopOpacity=".01" />
            </linearGradient>
          </defs>
          {[0, 1, 2, 3, 4].map((n) => (
            <g key={n}>
              <line
                x1="48"
                x2="690"
                y1={22 + n * 45}
                y2={22 + n * 45}
                stroke="#eeeef4"
                strokeDasharray="3 4"
              />
              <text x="0" y={26 + n * 45} fontSize="10" fill="#9996a7">
                {axisLabel(max * (1 - n / 4))}
              </text>
            </g>
          ))}
          <polygon
            points={`48,202 ${collectedLine} 690,202`}
            fill={`url(#${id}-fill)`}
          />
          {showInvoiced && (
            <polyline
              points={invoicedLine}
              fill="none"
              stroke="#d4c8f5"
              strokeWidth="2.2"
              strokeDasharray="5 5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}
          <polyline
            className="chart-line"
            points={collectedLine}
            fill="none"
            stroke="#8c6be8"
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {points.map((p, i) => (
            <g key={`${p.year}-${p.month}`}>
              <text
                x={x(i)}
                y="229"
                textAnchor="middle"
                fontSize="10"
                fill="#9996a7"
              >
                {p.month}
              </text>
              <circle
                cx={x(i)}
                cy={y(p.collected)}
                r={hover === i ? 5 : 3.5}
                fill="white"
                stroke="#8c6be8"
                strokeWidth="2"
              />
              <rect
                x={x(i) - 35}
                y="0"
                width="70"
                height="205"
                fill="transparent"
                onMouseEnter={() => setHover(i)}
              />
            </g>
          ))}
        </svg>
        {hover !== null && points[hover] && (
          <div className="pointer-events-none absolute top-1 right-3 rounded-lg border bg-white px-3 py-2 text-xs shadow-md">
            <span className="text-muted-foreground">
              {points[hover].month} {points[hover].year}
            </span>
            <p className="mt-1 font-semibold text-primary">
              {formatMoney(points[hover].collected)} collected
            </p>
            <p className="mt-0.5 text-muted-foreground">
              {formatMoney(points[hover].invoiced)} invoiced
            </p>
          </div>
        )}
      </div>
      <div className="mt-3 flex items-center justify-center gap-5 text-[10px]">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded bg-[#8c6be8]" />
          Collected
        </span>
        <button
          aria-pressed={showInvoiced}
          onClick={() => setShowInvoiced(!showInvoiced)}
          className={cn(
            "flex items-center gap-1.5 rounded px-1 py-1 text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring",
            !showInvoiced && "line-through opacity-60",
          )}
        >
          <span className="w-4 border-t-2 border-dashed border-[#d4c8f5]" />
          Invoiced
        </button>
      </div>
    </Card>
  );
}
