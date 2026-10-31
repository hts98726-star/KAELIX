"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Download,
  Ellipsis,
  Search,
  SearchX,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Subscription, SubscriptionStatus } from "@/lib/dashboard/types";
import { billingDate, cn, currency } from "@/lib/utils";

const avatarColors: Record<string, string> = {
  violet: "bg-violet-100 text-violet-500",
  blue: "bg-blue-100 text-blue-500",
  pink: "bg-pink-100 text-pink-500",
  orange: "bg-orange-100 text-orange-500",
  green: "bg-emerald-100 text-emerald-600",
};
const statusVariants = {
  Active: "success",
  Trial: "default",
  Pending: "warning",
  Overdue: "destructive",
  Canceled: "secondary",
} as const;
const pageSize = 5;

export function CustomerAvatar({
  subscription,
}: {
  subscription: Subscription;
}) {
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full text-[10px] font-medium",
        avatarColors[subscription.color] ?? avatarColors.violet,
      )}
    >
      {subscription.initials}
    </span>
  );
}
export function StatusBadge({ status }: { status: SubscriptionStatus }) {
  return (
    <Badge variant={statusVariants[status]}>
      <span className="size-1 rounded-full bg-current" />
      {status}
    </Badge>
  );
}

/** Props are the integration boundary: pass API-backed records and loading/error states here. */
export function SubscriptionsTable({
  subscriptions,
  title = "Recent subscriptions",
  showViewAll = true,
  loading = false,
  error,
  onRetry,
}: {
  subscriptions: Subscription[];
  title?: string;
  showViewAll?: boolean;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [sortAscending, setSortAscending] = useState(false);
  const [selected, setSelected] = useState<Subscription | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const results = subscriptions.filter(
      (item) =>
        (status === "all" || item.status === status) &&
        `${item.customer} ${item.email} ${item.plan} ${item.id}`
          .toLowerCase()
          .includes(needle),
    );
    return sortAscending
      ? [...results].sort((a, b) => a.customer.localeCompare(b.customer))
      : results;
  }, [subscriptions, query, status, sortAscending]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const rows = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  function reset() {
    setQuery("");
    setStatus("all");
    setPage(1);
  }
  function exportCsv() {
    // Prefix spreadsheet formula characters; always quote and escape user-entered values.
    const cell = (value: string | number) =>
      `"${String(value)
        .replace(/^[=+@\-\t\r]/, "'$&")
        .replaceAll('"', '""')}"`;
    const csv = [
      [
        "Customer",
        "Email",
        "Plan",
        "Status",
        "Next billing date",
        "Monthly amount (USD)",
      ],
      ...filtered.map((s) => [
        s.customer,
        s.email,
        s.plan,
        s.status,
        s.nextBilling,
        s.amount,
      ]),
    ]
      .map((row) => row.map(cell).join(","))
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "kaelix-pulse-demo-subscriptions.csv";
    link.click();
    URL.revokeObjectURL(url);
    setAnnouncement(`Exported ${filtered.length} sample subscriptions.`);
  }

  return (
    <>
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 pb-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-semibold">{title}</h2>
            <Badge variant="default" className="px-2 py-0.5 text-[9px]">
              {subscriptions.length} total
            </Badge>
          </div>
          {showViewAll ? (
            <Link
              href="/subscriptions"
              className="flex items-center gap-1.5 text-[11px] font-medium text-primary hover:underline"
            >
              View all subscriptions <ArrowUpRight className="size-3.5" />
            </Link>
          ) : (
            <span className="text-[10px] text-muted-foreground">
              Sample customer records
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 px-5 pb-5 sm:px-6">
          <div className="relative min-w-40 flex-1 sm:max-w-[310px]">
            <Search className="absolute top-3 left-3 size-3.5 text-muted-foreground" />
            <Input
              aria-label="Search subscriptions"
              placeholder="Search by customer, email, or plan…"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              className="h-9 pl-9 text-[11px]"
            />
            {query && (
              <button
                className="absolute top-2 right-2 rounded p-0.5 text-muted-foreground hover:bg-muted"
                aria-label="Clear search"
                onClick={() => {
                  setQuery("");
                  setPage(1);
                }}
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
          >
            <SelectTrigger
              aria-label="Filter by status"
              className="h-9 min-w-[126px] text-[11px]"
            >
              <span className="flex items-center gap-2">
                <SlidersHorizontal className="size-3.5 text-muted-foreground" />
                <SelectValue />
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {Object.keys(statusVariants).map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            className="ml-auto h-9 text-[11px]"
            onClick={exportCsv}
            disabled={loading || !!error || filtered.length === 0}
          >
            <Download className="size-3.5!" />
            Export
          </Button>
        </div>
        <div className="relative overflow-x-auto" aria-busy={loading}>
          <table className="w-full min-w-[670px] text-left text-[11px]">
            <caption className="sr-only">
              Sample subscriptions with customer, plan, status, next billing
              date, and monthly amount.
            </caption>
            <thead className="border-y bg-[#fafafe] text-[10px] text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium sm:pl-6" scope="col">
                  <button
                    className="flex items-center gap-1.5 rounded outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => setSortAscending(!sortAscending)}
                  >
                    Customer{" "}
                    <ArrowDown
                      className={cn("size-3", sortAscending && "rotate-180")}
                    />
                    <span className="sr-only">
                      {sortAscending ? "Restore recent order" : "Sort A to Z"}
                    </span>
                  </button>
                </th>
                <th scope="col" className="px-3 py-3 font-medium">
                  Plan
                </th>
                <th scope="col" className="px-3 py-3 font-medium">
                  Status
                </th>
                <th scope="col" className="px-3 py-3 font-medium">
                  Next billing date
                </th>
                <th scope="col" className="px-3 py-3 font-medium">
                  Amount
                </th>
                <th scope="col" className="w-12 px-3 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 5 }, (_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }, (_, j) => (
                      <td className="px-5 py-5" key={j}>
                        <div className="h-4 animate-pulse rounded bg-muted" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : error ? (
                <tr>
                  <td colSpan={6} className="px-6 py-14 text-center">
                    <p className="text-sm font-medium">
                      Couldn’t load subscriptions
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {error}
                    </p>
                    {onRetry && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-4"
                        onClick={onRetry}
                      >
                        Try again
                      </Button>
                    )}
                  </td>
                </tr>
              ) : rows.length ? (
                rows.map((s) => (
                  <tr
                    key={s.id}
                    className="transition-colors hover:bg-[#fdfcff]"
                  >
                    <td className="px-5 py-3.5 sm:pl-6">
                      <div className="flex items-center gap-2.5">
                        <CustomerAvatar subscription={s} />
                        <div>
                          <p className="font-medium">{s.customer}</p>
                          <p className="mt-0.5 text-[10px] text-muted-foreground">
                            {s.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className="rounded-md border border-border bg-white px-2 py-1 text-[10px] text-[#74717e]">
                        {s.plan}
                      </span>
                    </td>
                    <td className="px-3 py-3.5">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="px-3 py-3.5 text-[#83818d]">
                      {s.status === "Canceled"
                        ? "—"
                        : billingDate(s.nextBilling)}
                    </td>
                    <td className="px-3 py-3.5 font-medium">
                      {currency(s.amount)}
                      <span className="text-[9px] font-normal text-muted-foreground">
                        {" "}
                        /mo
                      </span>
                    </td>
                    <td className="pr-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`View ${s.customer} subscription`}
                        onClick={() => setSelected(s)}
                      >
                        <Ellipsis />
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-accent text-primary">
                      <SearchX className="size-5" />
                    </span>
                    <p className="mt-3 text-sm font-medium">
                      {subscriptions.length
                        ? "No subscriptions found"
                        : "Your next chapter starts here"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {subscriptions.length
                        ? "Try another search or change your status filter."
                        : "Add your first demo subscription to get started."}
                    </p>
                    {(query || status !== "all") && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-4"
                        onClick={reset}
                      >
                        Clear filters
                      </Button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3.5 sm:px-6">
          <p className="text-[10px] text-muted-foreground" aria-live="polite">
            {loading ? (
              "Loading subscriptions…"
            ) : error ? (
              "Subscriptions unavailable"
            ) : filtered.length ? (
              <>
                Showing{" "}
                <span className="font-medium text-foreground">
                  {(currentPage - 1) * pageSize + 1}–
                  {Math.min(currentPage * pageSize, filtered.length)}
                </span>{" "}
                of{" "}
                <span className="font-medium text-foreground">
                  {filtered.length}
                </span>{" "}
                subscriptions
              </>
            ) : (
              "0 subscriptions"
            )}
          </p>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              className="size-7"
              disabled={currentPage <= 1 || loading || !!error}
              aria-label="Previous page"
              onClick={() => setPage(currentPage - 1)}
            >
              <ChevronLeft className="size-3.5!" />
            </Button>
            {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
              <Button
                key={n}
                variant={n === currentPage ? "default" : "ghost"}
                size="icon"
                className="size-7 rounded-md text-[10px]"
                aria-label={`Page ${n}`}
                aria-current={n === currentPage ? "page" : undefined}
                disabled={loading || !!error}
                onClick={() => setPage(n)}
              >
                {n}
              </Button>
            ))}
            <Button
              variant="outline"
              size="icon"
              className="size-7"
              disabled={currentPage >= pageCount || loading || !!error}
              aria-label="Next page"
              onClick={() => setPage(currentPage + 1)}
            >
              <ChevronRight className="size-3.5!" />
            </Button>
          </div>
        </div>
      </Card>
      <p role="status" className="sr-only">
        {announcement}
      </p>
      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent>
          <DialogTitle className="text-lg font-semibold">
            Subscription details
          </DialogTitle>
          <DialogDescription className="mt-1 text-xs text-muted-foreground">
            Sample subscription · {selected?.id}
          </DialogDescription>
          {selected && (
            <>
              <div className="mt-5 flex items-center gap-3">
                <CustomerAvatar subscription={selected} />
                <div>
                  <p className="text-sm font-medium">{selected.customer}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {selected.email}
                  </p>
                </div>
              </div>
              <dl className="mt-5 grid grid-cols-2 gap-5 border-t pt-5 text-xs">
                <div>
                  <dt className="text-muted-foreground">Plan</dt>
                  <dd className="mt-2 font-medium">{selected.plan}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Status</dt>
                  <dd className="mt-2">
                    <StatusBadge status={selected.status} />
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Next billing date</dt>
                  <dd className="mt-2 font-medium">
                    {selected.status === "Canceled"
                      ? "Not scheduled"
                      : billingDate(selected.nextBilling)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Monthly amount</dt>
                  <dd className="mt-2 font-medium">
                    {currency(selected.amount)}
                  </dd>
                </div>
              </dl>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
