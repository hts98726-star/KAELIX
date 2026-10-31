import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";
import { ArrowLeft } from "lucide-react";
import { RoleGate } from "@/components/auth/role-gate";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/commerce/data-table";
import { ActionButton } from "@/components/commerce/action-controls";
import { StatusPill } from "@/components/commerce/status";
import { transitionSubscription } from "@/actions/subscriptions";
import { getSubscriptionDetail } from "@/lib/commerce/data";
import { formatDate, formatMoney } from "@/lib/commerce/format";
import {
  LEGACY_TAX_RATE,
  actionLabels,
  allowedActions,
  isOverdue,
  money,
  periodLabel,
  titleCase,
} from "@/lib/commerce/rules";

export const metadata: Metadata = { title: "Subscription" };

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const subscription = /^[0-9a-f-]{36}$/i.test(id)
    ? await getSubscriptionDetail(id)
    : null;
  if (!subscription) notFound();
  const recurring = money(
    subscription.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0),
  );
  const actions = allowedActions(subscription.status, subscription.plan);
  const facts: [string, string][] = [
    ["Customer", subscription.user.name ? `${subscription.user.name} · ${subscription.user.email}` : subscription.user.email],
    ["Plan", subscription.plan?.name ?? "Custom (no plan)"],
    ["Billing", titleCase(subscription.billingCycle)],
    ["Payment terms", subscription.paymentTerms],
    ["Start date", formatDate(subscription.startDate)],
    ["Expiry date", formatDate(subscription.expiryDate)],
    [
      "Next invoice",
      subscription.nextInvoiceDate ? formatDate(subscription.nextInvoiceDate) : "Not scheduled",
    ],
    ...(subscription.validUntil
      ? ([["Quotation valid until", formatDate(subscription.validUntil)]] as [string, string][])
      : []),
    ...(subscription.template
      ? ([["From template", subscription.template.name]] as [string, string][])
      : []),
    ...(subscription.closedAt
      ? ([["Closed", formatDate(subscription.closedAt)]] as [string, string][])
      : []),
  ];
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/subscriptions"
            className="mb-3 flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="size-3" /> All subscriptions
          </Link>
          <h1 className="flex flex-wrap items-center gap-3 font-mono text-2xl font-semibold tracking-tight">
            {subscription.planNumber}
            <StatusPill status={subscription.status} />
          </h1>
          <p className="mt-2 text-xs text-muted-foreground">
            {formatMoney(recurring)} per {periodLabel[subscription.billingCycle] ?? "period"} before tax
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-2" aria-label="Subscription actions">
          {actions.length === 0 && (
            <span className="text-xs text-muted-foreground">No further actions</span>
          )}
          {actions.map((action) => (
            <ActionButton
              key={action}
              action={transitionSubscription.bind(null, subscription.id, action)}
              label={actionLabels[action]}
              variant={action === "close" ? "outline" : "default"}
              confirm={
                action === "close"
                  ? "Close this subscription? No further invoices will be created."
                  : undefined
              }
            />
          ))}
        </div>
      </div>
      {subscription.plan && (
        <p className="text-[11px] text-muted-foreground">
          Plan rules: {subscription.plan.closable ? "closable" : "not closable"} ·{" "}
          {subscription.plan.pausable ? "pausable" : "not pausable"} ·{" "}
          {subscription.plan.renewable ? "renewable" : "not renewable"} ·{" "}
          {subscription.plan.autoClose ? "closes automatically at expiry" : "stays open at expiry"}
        </p>
      )}
      <Card className="p-6">
        <dl className="grid gap-5 text-xs sm:grid-cols-2 lg:grid-cols-3">
          {facts.map(([label, value]) => (
            <div key={label}>
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="mt-1.5 break-words font-medium">{value}</dd>
            </div>
          ))}
        </dl>
        {subscription.notes && (
          <p className="mt-5 border-t pt-4 text-xs leading-6 text-muted-foreground">
            {subscription.notes}
          </p>
        )}
      </Card>
      <section aria-label="Subscription lines" className="space-y-3">
        <h2 className="text-sm font-semibold">Order lines</h2>
        <DataTable
          caption="Subscription lines"
          columns={["Product", "Quantity", "Unit price", "Tax", "Amount"]}
        >
          {subscription.lines.map((line) => (
            <tr key={line.id}>
              <td className="px-5 py-4">
                {line.product.name}
                {line.variant && (
                  <span className="block text-[10px] text-muted-foreground">
                    {line.variant.attribute}: {line.variant.value}
                  </span>
                )}
              </td>
              <td className="px-5 py-4">{line.quantity}</td>
              <td className="px-5 py-4">{formatMoney(line.unitPrice)}</td>
              <td className="px-5 py-4">{line.taxRate ?? LEGACY_TAX_RATE}%</td>
              <td className="px-5 py-4 font-medium">
                {formatMoney(money(line.quantity * line.unitPrice))}
              </td>
            </tr>
          ))}
        </DataTable>
      </section>
      <section aria-label="Subscription invoices" className="space-y-3">
        <h2 className="text-sm font-semibold">Invoices</h2>
        {subscription.invoices.length === 0 ? (
          <Card className="p-6 text-xs text-muted-foreground">
            No invoices yet. Invoices are created when the subscription starts
            and on each billing date.
          </Card>
        ) : (
          <DataTable
            caption="Invoices for this subscription"
            columns={["Invoice", "Period", "Total", "Paid", "Status"]}
          >
            {subscription.invoices.map((invoice) => (
              <tr key={invoice.id}>
                <td className="px-5 py-4">
                  <Link
                    href={`/invoices/${invoice.id}`}
                    className="font-mono text-[11px] text-primary hover:underline"
                  >
                    {invoice.number ?? "Draft"}
                  </Link>
                </td>
                <td className="px-5 py-4 text-muted-foreground">
                  {invoice.periodStart
                    ? `${formatDate(invoice.periodStart)} – ${invoice.periodEnd ? formatDate(invoice.periodEnd) : ""}`
                    : formatDate(invoice.issueDate)}
                </td>
                <td className="px-5 py-4 font-medium">{formatMoney(invoice.grandTotal)}</td>
                <td className="px-5 py-4">
                  {formatMoney(invoice.payments.reduce((s, p) => s + p.amount, 0))}
                </td>
                <td className="px-5 py-4">
                  <StatusPill status={isOverdue(invoice) ? "OVERDUE" : invoice.status} />
                </td>
              </tr>
            ))}
          </DataTable>
        )}
      </section>
    </div>
  );
}

export default function SubscriptionPage(props: {
  params: Promise<{ id: string }>;
}) {
  return (
    <RoleGate roles={["ADMIN", "STAFF"]}>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <Detail params={props.params} />
      </Suspense>
    </RoleGate>
  );
}
