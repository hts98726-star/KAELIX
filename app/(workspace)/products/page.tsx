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
import { getProducts, getTaxRules } from "@/lib/commerce/data";
export const metadata: Metadata = { title: "Products" };
async function ProductData() {
  await connection();
  const user = await requirePageUser(["ADMIN", "STAFF"]);
  let data;
  try {
    const [products, taxRules] = await Promise.all([
      getProducts({ includeArchived: user.role === "ADMIN" }),
      getTaxRules(),
    ]);
    data = { products, taxRules };
  } catch {
    return <WorkspaceUnavailable />;
  }
  return (
    <ProductCatalog
      products={data.products}
      taxRules={data.taxRules}
      canCreate={user.role === "ADMIN"}
    />
  );
}
function ProductsPageContent() {
  return (
    <div className="page-enter space-y-7">
      <WorkspaceHeading
        title="Good things to offer"
        description="Your catalog, your prices. Products power checkout, recurring plans, and quotation templates."
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
