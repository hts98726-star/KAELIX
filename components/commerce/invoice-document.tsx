import type { InvoiceDetail } from "@/lib/commerce/data";
import { formatDate, formatMoney } from "@/lib/commerce/format";
import { LEGACY_TAX_RATE, money } from "@/lib/commerce/rules";
import { StatusPill } from "./status";
import { isOverdue } from "@/lib/commerce/rules";

/** The invoice as the customer sees it; shared by the workspace, portal, and print views. */
export function InvoiceDocument({ invoice }: { invoice: InvoiceDetail }) {
  const paid = money(invoice.payments.reduce((s, p) => s + p.amount, 0));
  // Invoices created before invoice lines existed fall back to their subscription lines.
  const lines = invoice.lines.length
    ? invoice.lines
    : invoice.subscription.lines.map((line) => ({
        id: line.id,
        description: line.variant
          ? `${line.product.name} (${line.variant.attribute}: ${line.variant.value})`
          : line.product.name,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        taxRate: line.taxRate ?? LEGACY_TAX_RATE,
        discount: 0,
        amount: money(line.quantity * line.unitPrice),
      }));
  const customer = invoice.subscription.user;
  return (
    <article className="rounded-xl border bg-white p-6 text-xs sm:p-8" aria-label="Invoice document">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b pb-6">
        <div>
          <p className="text-[10px] font-semibold tracking-[2px] text-primary">
            BRIGHTLOOP SOFTWARE
          </p>
          <h2 className="mt-2 text-xl font-semibold">
            {invoice.number ? `Invoice ${invoice.number}` : "Draft invoice"}
          </h2>
          <p className="mt-1 font-mono text-[10px] text-muted-foreground">{invoice.id}</p>
        </div>
        <StatusPill status={isOverdue(invoice) ? "OVERDUE" : invoice.status} />
      </header>
      <dl className="grid gap-4 border-b py-6 sm:grid-cols-3">
        <div>
          <dt className="text-muted-foreground">Billed to</dt>
          <dd className="mt-1 font-medium">{customer.name ?? customer.email}</dd>
          {customer.name && <dd className="text-muted-foreground">{customer.email}</dd>}
        </div>
        <div>
          <dt className="text-muted-foreground">Subscription</dt>
          <dd className="mt-1 font-mono">{invoice.subscription.planNumber}</dd>
          <dd className="text-muted-foreground">{invoice.subscription.paymentTerms}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Dates</dt>
          <dd className="mt-1">Issued {formatDate(invoice.issueDate)}</dd>
          {invoice.dueDate && <dd>Due {formatDate(invoice.dueDate)}</dd>}
          {invoice.periodStart && invoice.periodEnd && (
            <dd className="text-muted-foreground">
              Period {formatDate(invoice.periodStart)} – {formatDate(invoice.periodEnd)}
            </dd>
          )}
        </div>
      </dl>
      <div className="overflow-x-auto">
        <table className="mt-4 w-full min-w-[520px] text-left">
          <caption className="sr-only">Invoice lines</caption>
          <thead className="text-[10px] text-muted-foreground">
            <tr>
              <th className="py-2 font-medium">Description</th>
              <th className="py-2 font-medium">Qty</th>
              <th className="py-2 font-medium">Unit price</th>
              <th className="py-2 font-medium">Discount</th>
              <th className="py-2 font-medium">Tax</th>
              <th className="py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {lines.map((line) => (
              <tr key={line.id}>
                <td className="py-3">{line.description}</td>
                <td className="py-3">{line.quantity}</td>
                <td className="py-3">{formatMoney(line.unitPrice)}</td>
                <td className="py-3">{line.discount ? `−${formatMoney(line.discount)}` : "—"}</td>
                <td className="py-3">{line.taxRate}%</td>
                <td className="py-3 text-right">{formatMoney(line.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl className="ml-auto mt-6 max-w-xs space-y-2 border-t pt-4">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd>{formatMoney(invoice.subTotal)}</dd>
        </div>
        {invoice.discountAmount > 0 && (
          <div className="flex justify-between">
            <dt className="text-muted-foreground">
              Discount{invoice.discountRule ? ` (${invoice.discountRule.name})` : ""}
            </dt>
            <dd>−{formatMoney(invoice.discountAmount)}</dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Tax</dt>
          <dd>{formatMoney(invoice.taxAmount)}</dd>
        </div>
        <div className="flex justify-between text-sm font-semibold">
          <dt>Total</dt>
          <dd data-testid="invoice-total">{formatMoney(invoice.grandTotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Paid</dt>
          <dd>{formatMoney(paid)}</dd>
        </div>
        <div className="flex justify-between font-medium">
          <dt>Balance due</dt>
          <dd data-testid="invoice-balance">
            {formatMoney(invoice.status === "CANCELLED" ? 0 : money(invoice.grandTotal - paid))}
          </dd>
        </div>
      </dl>
    </article>
  );
}
