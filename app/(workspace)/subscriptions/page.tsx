import { RoleGate } from "@/components/auth/role-gate";
import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/commerce/data-table";
import {
  WorkspaceEmpty,
  WorkspaceHeading,
  WorkspaceUnavailable,
} from "@/components/commerce/workspace-states";
import { getSubscriptions } from "@/lib/commerce/data";
import { formatDate, formatMoney } from "@/lib/commerce/format";

export const metadata: Metadata = { title: "Subscriptions" };
async function SubscriptionsData() {
  await connection();
  let subscriptions;
  try {
    subscriptions = await getSubscriptions();
  } catch {
    return <WorkspaceUnavailable />;
  }
  if (!subscriptions.length)
    return (
      <Card>
        <WorkspaceEmpty
          title="Ready for your first subscription?"
          description="Choose a customer and products at checkout. Your saved subscriptions will appear here."
        />
      </Card>
    );
  return (
    <DataTable
      columns={[
        "Subscription",
        "Customer",
        "Products",
        "Monthly subtotal",
        "Next renewal",
        "Status",
      ]}
      caption="Saved workspace subscriptions"
    >
      {subscriptions.map((subscription) => (
        <tr key={subscription.id} className="hover:bg-muted/20">
          <td className="max-w-[240px] break-all px-5 py-5 font-mono text-[10px]">
            {subscription.planNumber}
          </td>
          <td className="max-w-[200px] break-all px-5 py-5">
            {subscription.user.email}
          </td>
          <td className="max-w-[220px] px-5 py-5">
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
          <td className="px-5 py-5 font-medium">
            {formatMoney(
              subscription.lines.reduce(
                (sum, line) => sum + line.quantity * line.unitPrice,
                0,
              ),
            )}
          </td>
          <td className="px-5 py-5 whitespace-nowrap text-muted-foreground">
            {formatDate(subscription.expiryDate)}
          </td>
          <td className="px-5 py-5">
            <Badge
              variant={
                subscription.status.toUpperCase() === "ACTIVE"
                  ? "success"
                  : "secondary"
              }
            >
              {subscription.status}
            </Badge>
          </td>
        </tr>
      ))}
    </DataTable>
  );
}
function SubscriptionsPageContent() {
  return (
    <div className="page-enter space-y-6">
      <WorkspaceHeading
        title="Subscriptions"
        description="Every customer. Every product. A lasting record of the subscriptions created in this workspace."
      />
      <Suspense fallback={<Skeleton className="h-72 w-full" />}>
        <SubscriptionsData />
      </Suspense>
    </div>
  );
}

export default function SubscriptionsPage() {
  return (
    <RoleGate roles={["ADMIN", "STAFF"]}>
      <SubscriptionsPageContent />
    </RoleGate>
  );
}
