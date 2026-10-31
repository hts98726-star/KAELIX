"use client";
import { useRef, useState, useTransition } from "react";
import { LoaderCircle, Package, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { createProduct } from "@/actions/products";
import type { ProductOption } from "@/lib/commerce/types";
import { formatMoney } from "@/lib/commerce/format";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function ProductCatalog({ products }: { products: ProductOption[] }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div>
        {products.length ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {products.map((product) => (
              <Card key={product.id} className="min-w-0 p-5">
                <div className="flex items-center justify-between">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-primary">
                    <Package className="size-5" />
                  </span>
                  <Badge variant="secondary">Monthly</Badge>
                </div>
                <h2 className="mt-5 break-words text-sm font-semibold">
                  {product.name}
                </h2>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {product.variantName || "Standard service"}
                </p>
                <p className="mt-4 text-2xl font-semibold tracking-tight">
                  {formatMoney(
                    product.basePrice +
                      (product.variantName ? product.markupPrice : 0),
                  )}
                  <span className="text-[10px] font-normal text-muted-foreground">
                    {" "}
                    / month
                  </span>
                </p>
                {product.notes && (
                  <p className="mt-3 break-words text-xs leading-6 text-muted-foreground">
                    {product.notes}
                  </p>
                )}
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
              Add a monthly service to your catalog. It will be available at
              checkout as soon as it’s saved.
            </p>
          </Card>
        )}
      </div>
      <Card className="p-5 sm:p-6">
        <h2 className="text-sm font-semibold">Something new to offer</h2>
        <p className="mt-2 text-[11px] leading-6 text-muted-foreground">
          Create a monthly service. All prices are in USD.
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
      </Card>
    </div>
  );
}
