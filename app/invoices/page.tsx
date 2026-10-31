import type { Metadata } from "next";
import { ReceiptText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { mockSubscriptions } from "@/lib/dashboard/mock-data";
import { billingDate, currency } from "@/lib/utils";

export const metadata: Metadata = { title: "Invoices" };
export default function InvoicesPage() {
  const sample = mockSubscriptions.filter(
    (s) => s.status === "Overdue" || s.status === "Pending",
  );
  return (
    <div className="page-enter space-y-6">
      <div>
        <Badge className="mb-3">Sample data</Badge>
        <h1 className="text-3xl font-semibold tracking-tight">
          Every detail, accounted for<span className="text-primary">.</span>
        </h1>
        <p className="mt-2 text-xs leading-6 text-muted-foreground">
          An invoice layout preview. Your team’s billing API will provide actual
          invoices.
        </p>
      </div>
      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 border-b p-5 text-sm font-semibold">
          <ReceiptText className="size-4 text-primary" />
          Sample invoice preview
        </div>
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-xs">
            <caption className="sr-only">
              Synthetic invoice layout examples
            </caption>
            <thead className="bg-muted/50 text-[10px] text-muted-foreground">
              <tr>
                {["Reference", "Customer", "Due date", "Amount", "Status"].map(
                  (label) => (
                    <th
                      key={label}
                      scope="col"
                      className="px-5 py-3 font-medium"
                    >
                      {label}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y">
              {sample.map((s, i) => (
                <tr key={s.id}>
                  <td className="px-5 py-5 font-medium">
                    DEMO-INV-{String(i + 1).padStart(3, "0")}
                  </td>
                  <td className="px-5 py-5">{s.customer}</td>
                  <td className="px-5 py-5 text-muted-foreground">
                    {billingDate(s.nextBilling)}
                  </td>
                  <td className="px-5 py-5">{currency(s.amount)}</td>
                  <td className="px-5 py-5">
                    <Badge
                      variant={
                        s.status === "Overdue" ? "destructive" : "warning"
                      }
                    >
                      {s.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="text-[11px] text-muted-foreground">
        Preview only. No invoices are issued and no payments are processed.
      </p>
    </div>
  );
}
