import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  WorkspaceEmpty,
  WorkspaceHeading,
  WorkspaceUnavailable,
} from "@/components/commerce/workspace-states";
import { getCustomers } from "@/lib/commerce/data";
import { formatDate } from "@/lib/commerce/format";

export const metadata: Metadata = { title: "Customers" };
async function CustomersData() {
  await connection();
  let customers;
  try {
    customers = await getCustomers();
  } catch {
    return <WorkspaceUnavailable />;
  }
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2 border-b p-5 text-sm font-semibold">
        <Users className="size-4 text-primary" />
        Customers<Badge>{customers.length}</Badge>
      </div>
      {customers.length === 0 ? (
        <WorkspaceEmpty
          title="Every relationship starts somewhere"
          description="Create your first customer account. It will appear here as soon as it’s saved."
          href="/signup"
          label="Create an account"
        />
      ) : (
        <div className="grid divide-y sm:grid-cols-2">
          {customers.map((customer) => (
            <div
              key={customer.id}
              className="flex min-w-0 items-center gap-3 p-5"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-primary">
                {customer.email.slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="break-all text-xs font-medium">
                  {customer.email}
                </h2>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Joined {formatDate(customer.createdAt)}
                </p>
              </div>
              <Badge variant="secondary">
                {customer._count.subscriptions} subscriptions
              </Badge>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
export default function CustomersPage() {
  return (
    <div className="page-enter space-y-6">
      <WorkspaceHeading
        title="Good company"
        description="The people behind your subscriptions. Accounts shown here are saved in your workspace."
        action="signup"
      />
      <Suspense fallback={<Skeleton className="h-72 w-full" />}>
        <CustomersData />
      </Suspense>
    </div>
  );
}
