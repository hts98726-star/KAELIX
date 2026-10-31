import { RoleGate } from "@/components/auth/role-gate";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/commerce/data-table";
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
import { listSubscriptions } from "@/lib/commerce/data";
import { formatDate, formatMoney } from "@/lib/commerce/format";
import { SUBSCRIPTION_STATUSES, periodLabel } from "@/lib/commerce/rules";

export const metadata: Metadata = { title: "Subscriptions" };
type Search = { status?: string; q?: string; page?: string };

async function SubscriptionsData({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  await connection();
  const params = await searchParams;
  const status = SUBSCRIPTION_STATUSES.includes(
    params.status as (typeof SUBSCRIPTION_STATUSES)[number],
  )
    ? params.status!
    : "";
  const q = (params.q ?? "").trim().slice(0, 100);
  let result;
  try {
    result = await listSubscriptions({ status, q, page: Number(params.page) });
  } catch {
    return <WorkspaceUnavailable />;
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterChips
          base="/subscriptions"
          options={[...SUBSCRIPTION_STATUSES]}
          current={status}
          counts={result.counts}
          q={q}
        />
        <SearchBox
          base="/subscriptions"
          q={q}
          status={status}
          placeholder="Reference, customer email or name…"
        />
      </div>
      {result.rows.length === 0 ? (
        <Card>
          <WorkspaceEmpty
            title={
              status || q
                ? "No subscriptions match"
                : "Ready for your first subscription?"
            }
            description={
              status || q
                ? "Try another status or search."
                : "Create a quotation from a template, or use checkout for a quick monthly subscription."
            }
            href="/subscriptions/new"
            label="New subscription"
          />
        </Card>
      ) : (
        <DataTable
          columns={[
            "Subscription",
            "Customer",
            "Plan / products",
            "Recurring",
            "Next invoice",
            "Status",
          ]}
          caption="Saved workspace subscriptions"
        >
          {result.rows.map((subscription) => (
            <tr key={subscription.id} className="hover:bg-muted/20">
              <td className="max-w-[240px] break-all px-5 py-5 font-mono text-[10px]">
                <Link
                  href={`/subscriptions/${subscription.id}`}
                  className="text-primary hover:underline"
                >
                  {subscription.planNumber}
                </Link>
              </td>
              <td className="max-w-[200px] break-all px-5 py-5">
                {subscription.user.name && (
                  <span className="block font-medium">
                    {subscription.user.name}
                  </span>
                )}
                <span className="text-muted-foreground">
                  {subscription.user.email}
                </span>
              </td>
              <td className="max-w-[220px] px-5 py-5">
                {subscription.plan && (
                  <p className="font-medium">{subscription.plan.name}</p>
                )}
                <ul className="space-y-1">
                  {subscription.lines.map((line) => (
                    <li key={line.id} className="break-words">
                      {line.product.name}
                      <span className="text-muted-foreground">
                        {" "}
                        × {line.quantity}
                      </span>
                    </li>
                  ))}
                </ul>
              </td>
              <td className="px-5 py-5 font-medium whitespace-nowrap">
                {formatMoney(
                  subscription.lines.reduce(
                    (sum, line) => sum + line.quantity * line.unitPrice,
                    0,
                  ),
                )}
                <span className="text-[10px] font-normal text-muted-foreground">
                  {" "}
                  /{periodLabel[subscription.billingCycle] ?? "period"}
                </span>
              </td>
              <td className="px-5 py-5 whitespace-nowrap text-muted-foreground">
                {subscription.nextInvoiceDate
                  ? formatDate(subscription.nextInvoiceDate)
                  : "—"}
              </td>
              <td className="px-5 py-5">
                <StatusPill status={subscription.status} />
              </td>
            </tr>
          ))}
        </DataTable>
      )}
      <Pager
        base="/subscriptions"
        page={result.page}
        pageCount={result.pageCount}
        total={result.total}
        params={{ status, q }}
      />
    </div>
  );
}
function SubscriptionsPageContent({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  return (
    <div className="page-enter space-y-6">
      <WorkspaceHeading
        title="Subscriptions"
        description="Every customer, plan, and stage — from draft and quotation to active and closed."
        action="subscription"
      />
      <Suspense fallback={<Skeleton className="h-72 w-full" />}>
        <SubscriptionsData searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

export default function SubscriptionsPage(props: {
  searchParams: Promise<Search>;
}) {
  return (
    <RoleGate roles={["ADMIN", "STAFF"]}>
      <SubscriptionsPageContent searchParams={props.searchParams} />
    </RoleGate>
  );
}
