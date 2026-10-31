import { requirePageUser } from "@/lib/auth/authorize";
import { RoleGate } from "@/components/auth/role-gate";
import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { ProductCatalog } from "@/components/commerce/product-catalog";
import {
  WorkspaceHeading,
  WorkspaceUnavailable,
} from "@/components/commerce/workspace-states";
import { Skeleton } from "@/components/ui/skeleton";
import { getProducts } from "@/lib/commerce/data";
export const metadata: Metadata = { title: "Products" };
async function ProductData() {
  await connection();
  const user = await requirePageUser(["ADMIN", "STAFF"]);
  let products;
  try {
    products = await getProducts();
  } catch {
    return <WorkspaceUnavailable />;
  }
  return (
    <ProductCatalog products={products} canCreate={user.role === "ADMIN"} />
  );
}
function ProductsPageContent() {
  return (
    <div className="page-enter space-y-7">
      <WorkspaceHeading
        title="Good things to offer"
        description="Your catalog, your prices. Products saved here are available for new subscriptions at checkout."
      />
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <ProductData />
      </Suspense>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <RoleGate roles={["ADMIN", "STAFF"]}>
      <ProductsPageContent />
    </RoleGate>
  );
}
