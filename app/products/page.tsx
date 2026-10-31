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
  let products;
  try {
    products = await getProducts();
  } catch {
    return <WorkspaceUnavailable />;
  }
  return <ProductCatalog products={products} />;
}
export default function ProductsPage() {
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
