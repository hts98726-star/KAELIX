import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";
import { ArrowLeft, Printer } from "lucide-react";
import { RoleGate } from "@/components/auth/role-gate";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ActionButton,
  ActionForm,
  Field,
  nativeSelect,
} from "@/components/commerce/action-controls";
import { InvoiceDocument } from "@/components/commerce/invoice-document";
import {
  cancelInvoice,
  confirmInvoice,
  recordPayment,
  sendInvoice,
} from "@/actions/invoices";
import { getInvoiceDetail } from "@/lib/commerce/data";
import { formatDate, formatMoney } from "@/lib/commerce/format";
import { PAYMENT_METHODS, money, titleCase } from "@/lib/commerce/rules";

export const metadata: Metadata = { title: "Invoice" };

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const invoice = /^[0-9a-f-]{36}$/i.test(id) ? await getInvoiceDetail(id) : null;
  if (!invoice) notFound();
  const paid = money(invoice.payments.reduce((s, p) => s + p.amount, 0));
  const balance = money(invoice.grandTotal - paid);
  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-5">
        <Link
          href={`/subscriptions/${invoice.subscription.id}`}
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="size-3" /> Subscription {invoice.subscription.planNumber}
        </Link>
        <InvoiceDocument invoice={invoice} />
        <section aria-label="Payments" className="space-y-3">
          <h2 className="text-sm font-semibold">Payments</h2>
          {invoice.payments.length === 0 ? (
            <Card className="p-5 text-xs text-muted-foreground">No payments recorded.</Card>
          ) : (
            <Card className="divide-y">
              {invoice.payments.map((payment) => (
                <div key={payment.id} className="flex flex-wrap items-center justify-between gap-2 p-4 text-xs">
                  <span>
                    <span className="font-medium">{formatMoney(payment.amount)}</span>{" "}
                    · {titleCase(payment.method)} · {formatDate(payment.date)}
                  </span>
                  {payment.note && <span className="text-muted-foreground">{payment.note}</span>}
                </div>
              ))}
            </Card>
          )}
        </section>
      </div>
      <div className="space-y-4">
        <Card className="space-y-3 p-5">
          <h2 className="text-sm font-semibold">Actions</h2>
          <div className="flex flex-wrap gap-2" aria-label="Invoice actions">
            {invoice.status === "DRAFT" && (
              <ActionButton action={confirmInvoice.bind(null, invoice.id)} label="Confirm invoice" variant="default" />
            )}
            {["CONFIRMED", "PAID"].includes(invoice.status) && (
              <ActionButton action={sendInvoice.bind(null, invoice.id)} label="Send to customer" />
            )}
            {["DRAFT", "CONFIRMED"].includes(invoice.status) && invoice.payments.length === 0 && (
              <ActionButton
                action={cancelInvoice.bind(null, invoice.id)}
                label="Cancel invoice"
                confirm="Cancel this invoice? This can’t be undone."
              />
            )}
            <Link
              href={`/print/invoices/${invoice.id}`}
              target="_blank"
              className="inline-flex h-8 items-center gap-2 rounded-lg border bg-white px-3 text-xs font-medium hover:bg-accent"
            >
              <Printer className="size-3.5" /> Print
            </Link>
          </div>
          {invoice.sentAt && (
            <p className="text-[11px] text-muted-foreground">Last sent {formatDate(invoice.sentAt)}</p>
          )}
        </Card>
        {invoice.status === "CONFIRMED" && (
          <Card className="p-5">
            <h2 className="mb-1 text-sm font-semibold">Record a payment</h2>
            <p className="mb-4 text-[11px] text-muted-foreground">
              Outstanding balance {formatMoney(balance)}
            </p>
            <ActionForm action={recordPayment} submitLabel="Record payment" ariaLabel="Record payment">
              <input type="hidden" name="invoiceId" value={invoice.id} />
              <Field label="Amount ($)" htmlFor="pay-amount">
                <Input id="pay-amount" name="amount" type="number" min={0.01} max={balance} step="0.01" defaultValue={balance.toFixed(2)} required />
              </Field>
              <Field label="Method" htmlFor="pay-method">
                <select id="pay-method" name="method" className={nativeSelect} defaultValue="BANK_TRANSFER">
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>{titleCase(m)}</option>
                  ))}
                </select>
              </Field>
              <Field label="Payment date" htmlFor="pay-date">
                <Input id="pay-date" name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
              </Field>
              <Field label="Note" htmlFor="pay-note">
                <Input id="pay-note" name="note" maxLength={300} placeholder="e.g. Bank ref 4471" />
              </Field>
            </ActionForm>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function InvoicePage(props: { params: Promise<{ id: string }> }) {
  return (
    <RoleGate roles={["ADMIN", "STAFF"]}>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <Detail params={props.params} />
      </Suspense>
    </RoleGate>
  );
}
