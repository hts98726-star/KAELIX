import { RoleGate } from "@/components/auth/role-gate";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/commerce/data-table";
import { ActionButton } from "@/components/commerce/action-controls";
import {
  FilterChips,
  Pager,
  SearchBox,
  StatusPill,
} from "@/components/commerce/status";
import {
  WorkspaceEmpty,
  WorkspaceHeading,
  WorkspaceUnavailable,
} from "@/components/commerce/workspace-states";
import { runBillingNow } from "@/actions/invoices";
import { listInvoices } from "@/lib/commerce/data";
import { formatDate, formatMoney } from "@/lib/commerce/format";
import { INVOICE_STATUSES, isOverdue, money } from "@/lib/commerce/rules";

export const metadata: Metadata = { title: "Invoices" };
type Search = { status?: string; q?: string; page?: string };
const FILTERS = [...INVOICE_STATUSES, "OVERDUE"];

async function InvoicesData({ searchParams }: { searchParams: Promise<Search> }) {
  await connection();
  const params = await searchParams;
  const status = FILTERS.includes(params.status ?? "") ? params.status! : "";
  const q = (params.q ?? "").trim().slice(0, 100);
  let result;
  try {
    result = await listInvoices({ status, q, page: Number(params.page) });
  } catch {
    return <WorkspaceUnavailable />;
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterChips
          base="/invoices"
          options={FILTERS}
          current={status}
          counts={result.counts}
          q={q}
        />
        <SearchBox
          base="/invoices"
          q={q}
          status={status}
          placeholder="Invoice number, subscription, customer…"
        />
      </div>
      {result.rows.length === 0 ? (
        <Card>
          <WorkspaceEmpty
            title={status || q ? "No invoices match" : "A clean slate"}
            description={
              status || q
                ? "Try another status or search."
                : "Start a subscription or run billing to create draft invoices."
            }
          />
        </Card>
      ) : (
        <DataTable
          columns={[
            "Invoice / subscription",
            "Customer",
            "Issued",
            "Due",
            "Total",
            "Balance",
            "Status",
          ]}
          caption="Saved workspace invoices"
        >
          {result.rows.map((invoice) => (
            <tr key={invoice.id} className="hover:bg-muted/20">
              <td className="max-w-[260px] px-5 py-5">
                <Link
                  href={`/invoices/${invoice.id}`}
                  className="block font-medium text-primary hover:underline"
                >
                  {invoice.number ?? "Draft invoice"}
                </Link>
                <span className="mt-1 block break-all font-mono text-[10px] text-muted-foreground">
                  {invoice.id}
                </span>
                <span className="mt-1 block break-all text-[9px] text-muted-foreground">
                  {invoice.subscription.planNumber}
                </span>
              </td>
              <td className="max-w-[200px] break-all px-5 py-5">
                {invoice.subscription.user.email}
              </td>
              <td className="px-5 py-5 whitespace-nowrap text-muted-foreground">
                {formatDate(invoice.issueDate)}
              </td>
              <td className="px-5 py-5 whitespace-nowrap text-muted-foreground">
                {invoice.dueDate ? formatDate(invoice.dueDate) : "—"}
              </td>
              <td className="px-5 py-5 font-semibold">
                {formatMoney(invoice.grandTotal)}
              </td>
              <td className="px-5 py-5">
                {invoice.status === "CONFIRMED"
                  ? formatMoney(money(invoice.grandTotal - invoice.paid))
                  : "—"}
              </td>
              <td className="px-5 py-5">
                <StatusPill
                  status={isOverdue(invoice) ? "OVERDUE" : invoice.status}
                />
              </td>
            </tr>
          ))}
        </DataTable>
      )}
      <Pager
        base="/invoices"
        page={result.page}
        pageCount={result.pageCount}
        total={result.total}
        params={{ status, q }}
      />
    </div>
  );
}
function InvoicesPageContent({ searchParams }: { searchParams: Promise<Search> }) {
  return (
    <div className="page-enter space-y-6">
      <WorkspaceHeading
        title="Every detail, accounted for"
        description="Invoices move from Draft to Confirmed to Paid. A confirmed invoice is due by its payment terms and becomes overdue the day after."
        action="none"
      />
      <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <h2 className="text-sm font-semibold">Billing run</h2>
          <p className="mt-1 text-xs leading-6 text-muted-foreground">
            Creates one draft invoice for every due billing period of active
            subscriptions. Running it twice never bills a period twice.
          </p>
        </div>
        <ActionButton action={runBillingNow} label="Run billing now" variant="default" />
      </Card>
      <Suspense fallback={<Skeleton className="h-72 w-full" />}>
        <InvoicesData searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

export default function InvoicesPage(props: { searchParams: Promise<Search> }) {
  return (
    <RoleGate roles={["ADMIN", "STAFF"]}>
      <InvoicesPageContent searchParams={props.searchParams} />
    </RoleGate>
  );
}
