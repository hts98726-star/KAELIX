"use client";

import { useId, useState } from "react";
import { TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RevenuePoint } from "@/lib/dashboard/types";
import { cn, currency } from "@/lib/utils";

export function RevenueChart({ data }: { data: RevenuePoint[] }) {
  const id = useId();
  const [range, setRange] = useState("6");
  const [hover, setHover] = useState<number | null>(null);
  const [showPrevious, setShowPrevious] = useState(true);
  const points = data.slice(-Number(range));
  const last = points.at(-1);
  const previous = points.at(-2);
  const change =
    last && previous && previous.current
      ? (((last.current - previous.current) / previous.current) * 100).toFixed(
          1,
        )
      : "0";
  const max = Math.max(
    60000,
    ...points.map((p) => Math.max(p.current, p.previous)),
  );
  const plot = (n: number, index: number) =>
    `${48 + (index / Math.max(1, points.length - 1)) * 642},${202 - (n / max) * 180}`;
  const currentLine = points.map((p, i) => plot(p.current, i)).join(" ");
  const previousLine = points.map((p, i) => plot(p.previous, i)).join(" ");

  return (
    <Card className="min-w-0 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Revenue overview</h2>
          <p className="mt-1 text-[11px] text-muted-foreground">
            A little perspective on your growth.
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
            <SelectItem value="6">Last 6 months</SelectItem>
            <SelectItem value="3">Last 3 months</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        <span className="text-[28px] leading-none font-semibold tracking-[-1px]">
          {currency(last?.current ?? 0)}
        </span>
        <span className="flex items-center gap-0.5 rounded-md bg-emerald-50 px-1.5 py-1 text-[10px] font-medium text-emerald-600">
          <TrendingUp className="size-3" />
          {change}%
        </span>
        <span className="text-[10px] text-muted-foreground">
          vs. previous month
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
                  `${p.month}: ${currency(p.current)}, comparison: ${currency(p.previous)}`,
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
                ${((max / 1000) * (1 - n / 4)).toFixed(0)}k
              </text>
            </g>
          ))}
          <polygon
            points={`48,202 ${currentLine} 690,202`}
            fill={`url(#${id}-fill)`}
          />
          {showPrevious && (
            <polyline
              points={previousLine}
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
            points={currentLine}
            fill="none"
            stroke="#8c6be8"
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {points.map((p, i) => {
            const x = 48 + (i / Math.max(1, points.length - 1)) * 642;
            return (
              <g key={p.month}>
                <text
                  x={x}
                  y="229"
                  textAnchor="middle"
                  fontSize="10"
                  fill="#9996a7"
                >
                  {p.month}
                </text>
                <circle
                  cx={x}
                  cy={202 - (p.current / max) * 180}
                  r={hover === i ? 5 : 3.5}
                  fill="white"
                  stroke="#8c6be8"
                  strokeWidth="2"
                />
                <rect
                  x={x - 35}
                  y="0"
                  width="70"
                  height="205"
                  fill="transparent"
                  onMouseEnter={() => setHover(i)}
                />
              </g>
            );
          })}
        </svg>
        {hover !== null && points[hover] && (
          <div className="pointer-events-none absolute top-1 right-3 rounded-lg border bg-white px-3 py-2 text-xs shadow-md">
            <span className="text-muted-foreground">
              {points[hover].month} 2026
            </span>
            <p className="mt-1 font-semibold text-primary">
              {currency(points[hover].current)}
            </p>
          </div>
        )}
      </div>
      <div className="mt-3 flex items-center justify-center gap-5 text-[10px]">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded bg-[#8c6be8]" />
          Monthly revenue
        </span>
        <button
          aria-pressed={showPrevious}
          onClick={() => setShowPrevious(!showPrevious)}
          className={cn(
            "flex items-center gap-1.5 rounded px-1 py-1 text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring",
            !showPrevious && "line-through opacity-60",
          )}
        >
          <span className="w-4 border-t-2 border-dashed border-[#d4c8f5]" />
          Comparison period
        </button>
      </div>
    </Card>
  );
}
