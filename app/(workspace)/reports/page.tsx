import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { RoleGate } from "@/components/auth/role-gate";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/commerce/data-table";
import {
  WorkspaceHeading,
  WorkspaceUnavailable,
} from "@/components/commerce/workspace-states";
import { getReport, monthStart } from "@/lib/dashboard/data";
import { formatDate, formatMoney } from "@/lib/commerce/format";
import { addDays, titleCase } from "@/lib/commerce/rules";

export const metadata: Metadata = { title: "Reports" };
type Search = { from?: string; to?: string };
const isDay = (v?: string) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
const iso = (d: Date) => d.toISOString().slice(0, 10);

async function ReportData({ searchParams }: { searchParams: Promise<Search> }) {
  await connection();
  const params = await searchParams;
  const now = new Date();
  const from = isDay(params.from) ? new Date(`${params.from}T00:00:00Z`) : monthStart(now);
  const toInclusive = isDay(params.to)
    ? new Date(`${params.to}T00:00:00Z`)
    : addDays(monthStart(now, 1), -1);
  let report;
  try {
    report = await getReport(from, addDays(toInclusive, 1), now);
  } catch {
    return <WorkspaceUnavailable />;
  }
  const presets = [
    ["This month", monthStart(now), addDays(monthStart(now, 1), -1)],
    ["Last month", monthStart(now, -1), addDays(monthStart(now), -1)],
    ["Last 3 months", monthStart(now, -2), addDays(monthStart(now, 1), -1)],
    ["Year to date", new Date(Date.UTC(now.getUTCFullYear(), 0, 1)), addDays(monthStart(now, 1), -1)],
  ] as const;
  const tiles: [string, string, string][] = [
    ["Monthly recurring revenue", formatMoney(report.mrr), `${formatMoney(report.arr)} annualized · active subscriptions`],
    ["Active subscriptions", String(report.activeCount), `${report.paused} paused · ${report.started} started, ${report.closed} closed in range`],
    ["Revenue collected", formatMoney(report.collected), "Payments recorded in range"],
    ["Invoiced", formatMoney(report.invoiced.total), `${report.invoiced.count} confirmed/paid invoices · tax ${formatMoney(report.invoiced.tax)} · discounts ${formatMoney(report.invoiced.discount)}`],
    ["Outstanding", formatMoney(report.outstanding), `${report.outstandingCount} confirmed invoices awaiting payment (today)`],
    ["Overdue", formatMoney(report.overdue), `${report.overdueCount} invoices past their due date (today)`],
  ];
  return (
    <div className="space-y-6">
      <Card className="flex flex-wrap items-end justify-between gap-4 p-5">
        <form className="flex flex-wrap items-end gap-3" aria-label="Report range">
          <label className="text-xs">
            <span className="mb-1.5 block font-medium">From</span>
            <input type="date" name="from" defaultValue={iso(from)} className="h-9 rounded-lg border px-3 text-xs" />
          </label>
          <label className="text-xs">
            <span className="mb-1.5 block font-medium">To</span>
            <input type="date" name="to" defaultValue={iso(toInclusive)} className="h-9 rounded-lg border px-3 text-xs" />
          </label>
          <button className="h-9 rounded-lg bg-primary px-4 text-xs font-medium text-primary-foreground">Apply</button>
        </form>
        <nav aria-label="Range presets" className="flex flex-wrap gap-2">
          {presets.map(([label, a, b]) => (
            <Link key={label} href={`/reports?from=${iso(a)}&to=${iso(b)}`} className="rounded-full border bg-white px-3 py-1.5 text-[11px] hover:bg-accent">
              {label}
            </Link>
          ))}
        </nav>
      </Card>
      <section aria-label="Summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {tiles.map(([label, value, detail]) => (
          <Card key={label} className="p-5">
            <p className="text-[12px] font-medium text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
            <p className="mt-2 text-[10px] leading-5 text-muted-foreground">{detail}</p>
          </Card>
        ))}
      </section>
      <div className="grid items-start gap-6 xl:grid-cols-2">
        <section aria-label="Overdue invoices" className="space-y-3">
          <h2 className="text-sm font-semibold">Overdue invoices</h2>
          {report.overdueInvoices.length === 0 ? (
            <Card className="p-5 text-xs text-muted-foreground">Nothing overdue. Nice.</Card>
          ) : (
            <DataTable caption="Overdue invoices" columns={["Invoice", "Customer", "Due", "Balance"]}>
              {report.overdueInvoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="px-5 py-3">
                    <Link href={`/invoices/${invoice.id}`} className="text-primary hover:underline">{invoice.number}</Link>
                  </td>
                  <td className="px-5 py-3">{invoice.subscription.user.name ?? invoice.subscription.user.email}</td>
                  <td className="px-5 py-3 text-rose-600">{invoice.dueDate && formatDate(invoice.dueDate)}</td>
                  <td className="px-5 py-3 font-medium">{formatMoney(invoice.balance)}</td>
                </tr>
              ))}
            </DataTable>
          )}
        </section>
        <section aria-label="Payments in range" className="space-y-3">
          <h2 className="text-sm font-semibold">Payments in range</h2>
          <div className="flex flex-wrap gap-2">
            {report.byMethod.map((m) => (
              <span key={m.method} className="rounded-full bg-accent px-3 py-1 text-[11px] text-primary">
                {titleCase(m.method)}: {formatMoney(m.amount)} ({m.count})
              </span>
            ))}
          </div>
          {report.payments.length === 0 ? (
            <Card className="p-5 text-xs text-muted-foreground">No payments recorded in this range.</Card>
          ) : (
            <DataTable caption="Payments in range" columns={["Date", "Invoice", "Customer", "Method", "Amount"]}>
              {report.payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-5 py-3 whitespace-nowrap">{formatDate(payment.date)}</td>
                  <td className="px-5 py-3">
                    <Link href={`/invoices/${payment.invoice.id}`} className="text-primary hover:underline">{payment.invoice.number ?? "Invoice"}</Link>
                  </td>
                  <td className="px-5 py-3">{payment.invoice.subscription.user.name ?? payment.invoice.subscription.user.email}</td>
                  <td className="px-5 py-3">{titleCase(payment.method)}</td>
                  <td className="px-5 py-3 font-medium">{formatMoney(payment.amount)}</td>
                </tr>
              ))}
            </DataTable>
          )}
        </section>
      </div>
    </div>
  );
}

export default function ReportsPage(props: { searchParams: Promise<Search> }) {
  return (
    <RoleGate roles={["ADMIN"]}>
      <div className="page-enter space-y-6">
        <WorkspaceHeading
          title="Finance summary"
          description="Recurring revenue, collections, outstanding balances, and overdue invoices for any period."
          action="none"
        />
        <Suspense fallback={<Skeleton className="h-96 w-full" />}>
          <ReportData searchParams={props.searchParams} />
        </Suspense>
      </div>
    </RoleGate>
  );
}
