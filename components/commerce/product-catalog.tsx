"use client";
import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { LoaderCircle, Package, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { createProduct } from "@/actions/products";
import type { CatalogProduct } from "@/lib/commerce/types";
import { formatMoney } from "@/lib/commerce/format";
import { PRODUCT_TYPES, titleCase } from "@/lib/commerce/rules";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { nativeSelect } from "@/components/commerce/action-controls";

export type TaxOption = { id: string; name: string; rate: number; isDefault: boolean };

export function ProductCatalog({
  products,
  canCreate,
  taxRules = [],
}: {
  products: CatalogProduct[];
  canCreate: boolean;
  taxRules?: TaxOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  return (
    <div
      className={
        canCreate
          ? "grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]"
          : "space-y-6"
      }
    >
      <div>
        {products.length ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {products.map((product) => (
              <Card
                key={product.id}
                className={`min-w-0 p-5 ${product.active ? "" : "opacity-60"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-primary">
                    <Package className="size-5" />
                  </span>
                  <span className="flex flex-wrap justify-end gap-1.5">
                    {!product.active && <Badge variant="warning">Archived</Badge>}
                    <Badge variant="secondary">{titleCase(product.type)}</Badge>
                  </span>
                </div>
                <h2 className="mt-5 break-words text-sm font-semibold">
                  {product.name}
                </h2>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {product.variantName || "Standard service"}
                  {product.variantCount > 0 &&
                    ` · ${product.variantCount} variant${product.variantCount === 1 ? "" : "s"}`}
                  {product.planCount > 0 &&
                    ` · ${product.planCount} plan${product.planCount === 1 ? "" : "s"}`}
                </p>
                <p className="mt-4 text-2xl font-semibold tracking-tight">
                  {formatMoney(
                    product.basePrice +
                      (product.variantName ? product.markupPrice : 0),
                  )}
                  <span className="text-[10px] font-normal text-muted-foreground">
                    {" "}
                    / period
                  </span>
                </p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Tax {product.taxRate}%{product.taxName ? ` (${product.taxName})` : " (default)"}
                  {canCreate && ` · Cost ${formatMoney(product.costPrice)}`}
                </p>
                {product.notes && (
                  <p className="mt-3 break-words text-xs leading-6 text-muted-foreground">
                    {product.notes}
                  </p>
                )}
                <Link
                  href={`/products/${product.id}`}
                  className="mt-4 inline-block text-[11px] font-medium text-primary hover:underline"
                  aria-label={`Manage ${product.name}`}
                >
                  {canCreate ? "Manage product" : "View details"}
                </Link>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed p-12 text-center">
            <Package className="mx-auto mb-4 size-8 text-primary" />
            <h2 className="text-lg font-semibold">
              Room for your first product.
            </h2>
            <p className="mt-3 text-xs leading-6 text-muted-foreground">
              Add a product to your catalog. It will be available at checkout
              and in plans as soon as it’s saved.
            </p>
          </Card>
        )}
      </div>
      {canCreate && (
        <Card className="p-5 sm:p-6">
          <h2 className="text-sm font-semibold">Something new to offer</h2>
          <p className="mt-2 text-[11px] leading-6 text-muted-foreground">
            The sales price is charged each billing period. All prices are in
            USD.
          </p>
          <form
            ref={formRef}
            aria-label="Add product"
            className="mt-5 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (pending) return;
              const data = new FormData(event.currentTarget);
              setResult(null);
              startTransition(async () => {
                try {
                  const response = await createProduct(data);
                  setResult(response);
                  if (response.success) {
                    formRef.current?.reset();
                    router.refresh();
                  }
                } catch {
                  setResult({
                    success: false,
                    message: "We couldn’t reach the server. Please try again.",
                  });
                }
              });
            }}
          >
            <fieldset disabled={pending} className="space-y-4">
              <div>
                <label
                  htmlFor="product-name"
                  className="mb-2 block text-xs font-medium"
                >
                  Product name
                </label>
                <Input
                  id="product-name"
                  name="name"
                  required
                  maxLength={80}
                  placeholder="e.g. Professional plan"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="product-type"
                    className="mb-2 block text-xs font-medium"
                  >
                    Type
                  </label>
                  <select
                    id="product-type"
                    name="type"
                    defaultValue="SERVICE"
                    className={nativeSelect}
                  >
                    {PRODUCT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {titleCase(type)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="product-tax"
                    className="mb-2 block text-xs font-medium"
                  >
                    Tax rule
                  </label>
                  <select id="product-tax" name="taxRuleId" defaultValue="" className={nativeSelect}>
                    <option value="">Default</option>
                    {taxRules.map((rule) => (
                      <option key={rule.id} value={rule.id}>
                        {rule.name} ({rule.rate}%)
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="product-price"
                    className="mb-2 block text-xs font-medium"
                  >
                    Monthly base price ($)
                  </label>
                  <Input
                    id="product-price"
                    name="basePrice"
                    type="number"
                    required
                    min={0}
                    max={1000000}
                    step="0.01"
                    placeholder="79.00"
                  />
                </div>
                <div>
                  <label
                    htmlFor="product-cost"
                    className="mb-2 block text-xs font-medium"
                  >
                    Cost price ($)
                  </label>
                  <Input
                    id="product-cost"
                    name="costPrice"
                    type="number"
                    min={0}
                    max={1000000}
                    step="0.01"
                    defaultValue="0"
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="product-variant"
                  className="mb-2 block text-xs font-medium"
                >
                  Variant name{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </label>
                <Input
                  id="product-variant"
                  name="variantName"
                  maxLength={80}
                  placeholder="e.g. Priority support"
                />
              </div>
              <div>
                <label
                  htmlFor="product-markup"
                  className="mb-2 block text-xs font-medium"
                >
                  Variant markup ($)
                </label>
                <Input
                  id="product-markup"
                  name="markupPrice"
                  type="number"
                  min={0}
                  max={1000000}
                  step="0.01"
                  defaultValue="0"
                />
              </div>
              <div>
                <label
                  htmlFor="product-notes"
                  className="mb-2 block text-xs font-medium"
                >
                  Description{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </label>
                <textarea
                  id="product-notes"
                  name="notes"
                  maxLength={500}
                  rows={3}
                  placeholder="A little detail goes a long way."
                  className="w-full resize-y rounded-lg border bg-white px-3 py-3 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </fieldset>
            {result && (
              <p
                role={result.success ? "status" : "alert"}
                aria-label="Catalog result"
                className={`rounded-lg px-3 py-3 text-xs leading-6 ${result.success ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}
              >
                {result.message}
              </p>
            )}
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? (
                <>
                  <LoaderCircle className="animate-spin" />
                  Saving product…
                </>
              ) : (
                <>
                  <Plus />
                  Add product
                </>
              )}
            </Button>
          </form>
          <p className="mt-4 text-[10px] leading-5 text-muted-foreground">
            Add named variants (such as a brand) and recurring plans from the
            product’s page after saving.
          </p>
        </Card>
      )}
    </div>
  );
}
