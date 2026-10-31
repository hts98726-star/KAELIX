import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, ReceiptText, Users, CreditCard } from "lucide-react";
import { RoleGate } from "@/components/auth/role-gate";
import {
  getCustomers,
  getSubscriptions,
  getInvoices,
} from "@/lib/commerce/data";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
async function StaffOverview() {
  const [customers, subscriptions, invoices] = await Promise.all([
    getCustomers(),
    getSubscriptions(),
    getInvoices(),
  ]);
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {[
        {
          label: "Customers",
          value: customers.length,
          Icon: Users,
          href: "/customers",
        },
        {
          label: "Subscriptions",
          value: subscriptions.length,
          Icon: CreditCard,
          href: "/subscriptions",
        },
        {
          label: "Invoices",
          value: invoices.length,
          Icon: ReceiptText,
          href: "/invoices",
        },
      ].map(({ label, value, Icon, href }) => (
        <Link key={label} href={href}>
          <Card className="p-6 transition-shadow hover:shadow-md">
            <Icon className="mb-5 size-5 text-primary" />
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-2 text-3xl font-semibold">{value}</p>
          </Card>
        </Link>
      ))}
    </div>
  );
}
function StaffContent() {
  return (
    <div className="space-y-7">
      <div>
        <Badge className="mb-3">Operations</Badge>
        <h1 className="text-3xl font-semibold tracking-tight">
          Staff Workspace<span className="text-primary">.</span>
        </h1>
        <p className="mt-3 text-xs leading-6 text-muted-foreground">
          Keep customers, subscriptions, and invoices moving. Product creation
          and administrator settings are managed by your administrator.
        </p>
      </div>
      <Suspense fallback={<p>Loading workspace…</p>}>
        <StaffOverview />
      </Suspense>
      <Button asChild>
        <Link href="/checkout">
          Open checkout
          <ArrowRight />
        </Link>
      </Button>
    </div>
  );
}
export default function StaffPage() {
  return (
    <RoleGate roles={["STAFF", "ADMIN"]}>
      <StaffContent />
    </RoleGate>
  );
}
