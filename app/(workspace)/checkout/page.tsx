import { RoleGate } from "@/components/auth/role-gate";
import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { CheckoutForm } from "@/components/commerce/checkout-form";
import {
  WorkspaceHeading,
  WorkspaceUnavailable,
} from "@/components/commerce/workspace-states";
import { Skeleton } from "@/components/ui/skeleton";
import { getCustomers, getProducts } from "@/lib/commerce/data";

export const metadata: Metadata = { title: "Checkout" };
async function CheckoutData() {
  await connection();
  let data;
  try {
    const [customers, products] = await Promise.all([
      getCustomers(),
      getProducts(),
    ]);
    data = { customers, products };
  } catch {
    return <WorkspaceUnavailable />;
  }
  return (
    <CheckoutForm
      customers={data.customers.map(({ id, email }) => ({ id, email }))}
      products={data.products}
    />
  );
}
function CheckoutPageContent() {
  return (
    <div className="page-enter space-y-7">
      <WorkspaceHeading
        title="Make it official"
        description="Choose a customer, pick their products, and bring a new subscription to life."
        action="signup"
      />
      <Suspense fallback={<Skeleton className="h-[560px] w-full" />}>
        <CheckoutData />
      </Suspense>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <RoleGate roles={["ADMIN", "STAFF"]}>
      <CheckoutPageContent />
    </RoleGate>
  );
}
