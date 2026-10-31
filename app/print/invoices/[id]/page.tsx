import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requirePageUser } from "@/lib/auth/authorize";
import { getInvoiceDetail, getOwnInvoiceDetail } from "@/lib/commerce/data";
import { InvoiceDocument } from "@/components/commerce/invoice-document";
import { PrintButton } from "@/components/commerce/print-button";

export const metadata: Metadata = { title: "Print invoice" };

// Outside the workspace shell so only the invoice prints. Customers may print only their own invoices.
async function Printable({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageUser();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const invoice =
    user.role === "CUSTOMER"
      ? await getOwnInvoiceDetail(id)
      : await getInvoiceDetail(id);
  if (!invoice) notFound();
  return (
    <main className="mx-auto max-w-3xl p-6 print:p-0">
      <div className="mb-4 flex justify-end print:hidden">
        <PrintButton />
      </div>
      <InvoiceDocument invoice={invoice} />
    </main>
  );
}
export default function PrintInvoicePage(props: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<p className="p-6 text-xs">Preparing invoice…</p>}>
      <Printable params={props.params} />
    </Suspense>
  );
}
