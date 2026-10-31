import { getOwnSubscriptions, getOwnInvoices } from "@/lib/commerce/data";
import { formatDate, formatMoney } from "@/lib/commerce/format";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/commerce/data-table";
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
                "Products",
                "Monthly subtotal",
                "Next renewal",
                "Status",
              ]}
            >
              {subscriptions.map((subscription) => (
                <tr key={subscription.id}>
                  <td className="max-w-[220px] break-all px-5 py-5 font-mono text-[10px]">
                    {subscription.planNumber}
                  </td>
                  <td className="px-5 py-5">
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
                  </td>
                  <td className="px-5 py-5">
                    {formatDate(subscription.expiryDate)}
                  </td>
                  <td className="px-5 py-5">
                    <Badge variant="success">{subscription.status}</Badge>
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
              columns={["Invoice", "Subscription", "Issued", "Total", "Status"]}
            >
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="max-w-[220px] break-all px-5 py-5 font-mono text-[10px]">
                    {invoice.id}
                  </td>
                  <td className="max-w-[220px] break-all px-5 py-5 font-mono text-[10px]">
                    {invoice.subscription.planNumber}
                  </td>
                  <td className="px-5 py-5">{formatDate(invoice.issueDate)}</td>
                  <td className="px-5 py-5 font-semibold">
                    {formatMoney(invoice.grandTotal)}
                  </td>
                  <td className="px-5 py-5">
                    <Badge
                      variant={
                        invoice.status.toUpperCase() === "PAID"
                          ? "success"
                          : "warning"
                      }
                    >
                      {invoice.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </DataTable>
          ) : (
            <Card className="p-8 text-center text-xs leading-6 text-muted-foreground">
              No invoices yet. Only invoices linked to your own subscriptions
              will appear here.
            </Card>
          )}
        </section>
      )}
    </div>
  );
}
