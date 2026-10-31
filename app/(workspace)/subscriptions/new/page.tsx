import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { RoleGate } from "@/components/auth/role-gate";
import { Skeleton } from "@/components/ui/skeleton";
import { SubscriptionBuilder } from "@/components/commerce/subscription-builder";
import {
  WorkspaceHeading,
  WorkspaceUnavailable,
} from "@/components/commerce/workspace-states";
import { getNewSubscriptionOptions } from "@/lib/commerce/data";

export const metadata: Metadata = { title: "New subscription" };
async function BuilderData() {
  await connection();
  let options;
  try {
    options = await getNewSubscriptionOptions();
  } catch {
    return <WorkspaceUnavailable />;
  }
  return <SubscriptionBuilder options={options} />;
}
export default function NewSubscriptionPage() {
  return (
    <RoleGate roles={["ADMIN", "STAFF"]}>
      <div className="page-enter space-y-6">
        <WorkspaceHeading
          title="New subscription"
          description="Start from a quotation template or a plan, add products, and save it as a draft or a quotation. Confirm and start it from its detail page."
          action="checkout"
        />
        <Suspense fallback={<Skeleton className="h-[560px] w-full" />}>
          <BuilderData />
        </Suspense>
      </div>
    </RoleGate>
  );
}
