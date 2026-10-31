import Link from "next/link";
import { getOwnSubscriptions, getOwnInvoices } from "@/lib/commerce/data";
import { formatDate, formatMoney } from "@/lib/commerce/format";
import { isOverdue, money, periodLabel } from "@/lib/commerce/rules";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/commerce/data-table";
import { StatusPill } from "@/components/commerce/status";
export async function PortalRecords({
  kind = "all",
}: {
  kind?: "all" | "subscriptions" | "invoices";
}) {
  const [subscriptions, invoices] = await Promise.all([
    kind !== "invoices" ? getOwnSubscriptions() : [],
    kind !== "subscriptions" ? getOwnInvoices() : [],
  ]);
  return (
    <div className="space-y-8">
      {kind !== "invoices" && (
        <section aria-label="Your subscriptions">
          <h2 className="mb-4 text-sm font-semibold">
            Your subscriptions{" "}
            <Badge variant="secondary">{subscriptions.length}</Badge>
          </h2>
          {subscriptions.length ? (
            <DataTable
              caption="Your saved subscriptions"
              columns={[
                "Reference",
                "Plan / products",
                "Recurring",
                "Next invoice",
                "Status",
              ]}
            >
              {subscriptions.map((subscription) => (
                <tr key={subscription.id}>
                  <td className="max-w-[220px] break-all px-5 py-5 font-mono text-[10px]">
                    {subscription.planNumber}
                  </td>
                  <td className="px-5 py-5">
                    {subscription.plan && (
                      <p className="font-medium">{subscription.plan.name}</p>
                    )}
                    {subscription.lines.map((line) => (
                      <p key={line.id}>
                        {line.product.name} × {line.quantity}
                      </p>
                    ))}
                  </td>
                  <td className="px-5 py-5">
                    {formatMoney(
                      subscription.lines.reduce(
                        (sum, line) => sum + line.quantity * line.unitPrice,
                        0,
                      ),
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {" "}
                      /{periodLabel[subscription.billingCycle] ?? "period"}
                    </span>
                  </td>
                  <td className="px-5 py-5">
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
          ) : (
            <Card className="p-8 text-center text-xs leading-6 text-muted-foreground">
              No subscriptions yet. Your subscriptions will appear here when
              your workspace creates them.
            </Card>
          )}
        </section>
      )}
      {kind !== "subscriptions" && (
        <section aria-label="Your invoices">
          <h2 className="mb-4 text-sm font-semibold">
            Your invoices <Badge variant="secondary">{invoices.length}</Badge>
          </h2>
          {invoices.length ? (
            <DataTable
              caption="Your saved invoices"
              columns={[
                "Invoice",
                "Subscription",
                "Issued",
                "Due",
                "Total",
                "Balance",
                "Status",
              ]}
            >
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="max-w-[220px] break-all px-5 py-5">
                    <Link
                      href={`/print/invoices/${invoice.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {invoice.number ?? "View invoice"}
                    </Link>
                    <span className="mt-1 block font-mono text-[10px] text-muted-foreground">
                      {invoice.id}
                    </span>
                  </td>
                  <td className="max-w-[220px] break-all px-5 py-5 font-mono text-[10px]">
                    {invoice.subscription.planNumber}
                  </td>
                  <td className="px-5 py-5">{formatDate(invoice.issueDate)}</td>
                  <td className="px-5 py-5">
                    {invoice.dueDate ? formatDate(invoice.dueDate) : "—"}
                  </td>
                  <td className="px-5 py-5 font-semibold">
                    {formatMoney(invoice.grandTotal)}
                  </td>
                  <td className="px-5 py-5">
                    {invoice.status === "CONFIRMED"
                      ? formatMoney(
                          money(
                            invoice.grandTotal -
                              invoice.payments.reduce(
                                (s, p) => s + p.amount,
                                0,
                              ),
                          ),
                        )
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
          ) : (
            <Card className="p-8 text-center text-xs leading-6 text-muted-foreground">
              No invoices yet. Only confirmed invoices linked to your own
              subscriptions appear here.
            </Card>
          )}
        </section>
      )}
    </div>
  );
}
