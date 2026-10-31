"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  FileText,
  LoaderCircle,
  Package,
  Plus,
  ReceiptText,
  Trash2,
  UserRound,
} from "lucide-react";
import { processCheckout } from "@/actions/checkout";
import { calculateTotalPricing } from "@/lib/pricing";
import type {
  CartItem,
  CustomerOption,
  ProductOption,
} from "@/lib/commerce/types";
import { formatMoney as currency } from "@/lib/commerce/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type CheckoutResult = Awaited<ReturnType<typeof processCheckout>>;
const money = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;
function price(product: ProductOption) {
  return money(
    calculateTotalPricing(
      product.basePrice,
      product.variantName
        ? [
            {
              id: product.id,
              name: product.variantName,
              markupPrice: product.markupPrice,
            },
          ]
        : [],
    ),
  );
}
export function CheckoutForm({
  customers,
  products,
}: {
  customers: CustomerOption[];
  products: ProductOption[];
}) {
  const router = useRouter();
  const [customer, setCustomer] = useState("");
  const [items, setItems] = useState<CartItem[]>([]);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<CheckoutResult | null>(null);
  const subtotal = money(
    items.reduce(
      (sum, item) =>
        sum +
        price(products.find((product) => product.id === item.productId)!) *
          item.quantity,
      0,
    ),
  );
  const tax = money(subtotal * 0.1);
  const total = money(subtotal + tax);
  const valid =
    customer &&
    items.length > 0 &&
    items.every(
      (item) =>
        Number.isInteger(item.quantity) &&
        item.quantity >= 1 &&
        item.quantity <= 999,
    );
  if (result?.success) {
    const { newSub, newInvoice } = result.data;
    return (
      <Card className="mx-auto max-w-2xl p-6 sm:p-10">
        <div className="text-center">
          <span className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="size-8" />
          </span>
          <Badge variant="success">Saved to your workspace</Badge>
          <h2 className="mt-5 text-2xl font-semibold tracking-tight">
            A new subscription. All set.
          </h2>
          <p className="mt-3 text-xs leading-6 text-muted-foreground">
            Your subscription and draft invoice were saved together. No payment
            has been collected.
          </p>
        </div>
        <dl className="mt-8 divide-y rounded-xl border px-5 text-xs">
          <div className="flex flex-wrap justify-between gap-2 py-4">
            <dt className="text-muted-foreground">Customer</dt>
            <dd className="break-all font-medium">
              {customers.find((entry) => entry.id === customer)?.email}
            </dd>
          </div>
          <div className="py-4">
            <dt className="text-muted-foreground">Subscription reference</dt>
            <dd
              className="mt-2 break-all font-mono text-[11px]"
              data-testid="subscription-reference"
            >
              {newSub.planNumber}
            </dd>
          </div>
          <div className="py-4">
            <dt className="text-muted-foreground">Invoice reference</dt>
            <dd
              className="mt-2 break-all font-mono text-[11px]"
              data-testid="invoice-reference"
            >
              {newInvoice.id}
            </dd>
          </div>
          <div className="flex justify-between py-4">
            <dt className="text-muted-foreground">Invoice status</dt>
            <dd>
              <Badge variant="warning">Draft</Badge>
            </dd>
          </div>
          <div className="flex justify-between py-4">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd>{currency(newInvoice.subTotal)}</dd>
          </div>
          <div className="flex justify-between py-4">
            <dt className="text-muted-foreground">Tax</dt>
            <dd>{currency(newInvoice.taxAmount)}</dd>
          </div>
          <div className="flex justify-between py-4 text-base font-semibold">
            <dt>Invoice total</dt>
            <dd>{currency(newInvoice.grandTotal)}</dd>
          </div>
        </dl>
        <div className="mt-7 flex flex-wrap gap-3">
          <Button asChild className="flex-1">
            <Link href="/invoices">
              <FileText />
              View invoices
            </Link>
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              setResult(null);
              setItems([]);
              router.refresh();
            }}
          >
            Create another
          </Button>
        </div>
      </Card>
    );
  }
  return (
    <form
      aria-label="Checkout"
      onSubmit={(event) => {
        event.preventDefault();
        if (!valid || pending) return;
        setResult(null);
        startTransition(async () => {
          try {
            const response = await processCheckout(customer, items);
            setResult(response);
          } catch {
            setResult({
              success: false,
              message:
                "We couldn’t confirm the result. Check your invoices before trying again.",
            });
          }
        });
      }}
      className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]"
    >
      <div className="space-y-6">
        <Card className="p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-xs font-semibold text-primary">
              01
            </span>
            <div>
              <h2 className="text-sm font-semibold">Who’s this for?</h2>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Choose an existing customer account.
              </p>
            </div>
            <UserRound className="ml-auto size-4 text-muted-foreground" />
          </div>
          <label
            htmlFor="checkout-customer"
            className="mb-2 block text-xs font-medium"
          >
            Customer
          </label>
          <Select
            value={customer}
            onValueChange={setCustomer}
            disabled={pending || customers.length === 0}
          >
            <SelectTrigger
              id="checkout-customer"
              className="h-12 w-full min-w-0"
            >
              <SelectValue placeholder="Select a customer" />
            </SelectTrigger>
            <SelectContent>
              {customers.map((entry) => (
                <SelectItem key={entry.id} value={entry.id}>
                  {entry.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-3 flex flex-wrap items-center gap-1 text-[11px] leading-6 text-muted-foreground">
            {customers.length
              ? "New to the workspace?"
              : "No customer accounts yet."}
            <Link
              href="/signup"
              className="font-medium text-primary hover:underline"
            >
              Create an account
              <ChevronRight className="ml-0.5 inline size-3" />
            </Link>
          </p>
        </Card>
        <Card className="p-5 sm:p-6">
          <div className="mb-6 flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-xs font-semibold text-primary">
              02
            </span>
            <div>
              <h2 className="text-sm font-semibold">
                Build their subscription
              </h2>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Monthly products, straight from your catalog.
              </p>
            </div>
            <Package className="ml-auto size-4 text-muted-foreground" />
          </div>
          {products.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center">
              <Package className="mx-auto mb-3 size-6 text-primary" />
              <h3 className="text-sm font-medium">Your catalog is waiting</h3>
              <p className="mt-2 text-xs leading-6 text-muted-foreground">
                Add a product to your catalog before creating a subscription.
              </p>
              <Button asChild variant="outline" className="mt-4">
                <Link href="/products">
                  Add your first product
                  <Plus />
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {products.map((product) => {
                const selected = items.some(
                  (item) => item.productId === product.id,
                );
                return (
                  <button
                    type="button"
                    disabled={pending || (!selected && items.length >= 50)}
                    aria-pressed={selected}
                    aria-label={`Select ${product.name}`}
                    key={product.id}
                    onClick={() =>
                      setItems((current) =>
                        selected
                          ? current.filter(
                              (item) => item.productId !== product.id,
                            )
                          : [
                              ...current,
                              { productId: product.id, quantity: 1 },
                            ],
                      )
                    }
                    className={`relative min-w-0 rounded-xl border p-4 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 ${selected ? "border-primary bg-accent/40 ring-1 ring-primary" : "hover:border-primary/40 hover:bg-muted/30"}`}
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-primary">
                        <Package className="size-4" />
                      </span>
                      <span
                        className={`flex size-5 items-center justify-center rounded-full border ${selected ? "border-primary bg-primary text-white" : "bg-white"}`}
                      >
                        {selected ? (
                          <Check className="size-3" />
                        ) : (
                          <Plus className="size-3 text-muted-foreground" />
                        )}
                      </span>
                    </div>
                    <span className="block break-words text-xs font-semibold">
                      {product.name}
                    </span>
                    <span className="mt-1 block text-[10px] text-muted-foreground">
                      {product.variantName || product.type}
                    </span>
                    <span className="mt-4 block text-lg font-semibold tracking-tight">
                      {currency(price(product))}
                      <span className="text-[10px] font-normal text-muted-foreground">
                        {" "}
                        / month
                      </span>
                    </span>
                    {product.notes && (
                      <span className="mt-2 block text-[10px] leading-5 text-muted-foreground">
                        {product.notes}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
          {items.length > 0 && (
            <div className="mt-6 border-t pt-5">
              <h3 className="mb-4 text-xs font-medium">Selected products</h3>
              <div className="space-y-4">
                {items.map((item) => {
                  const product = products.find(
                    (entry) => entry.id === item.productId,
                  )!;
                  return (
                    <div
                      key={item.productId}
                      className="flex flex-wrap items-center gap-3"
                    >
                      <span className="min-w-0 flex-1 text-xs font-medium">
                        {product.name}
                      </span>
                      <label
                        htmlFor={`qty-${item.productId}`}
                        className="sr-only"
                      >
                        {product.name} quantity
                      </label>
                      <Input
                        id={`qty-${item.productId}`}
                        type="number"
                        min={1}
                        max={999}
                        step={1}
                        required
                        value={item.quantity || ""}
                        disabled={pending}
                        onChange={(event) =>
                          setItems((current) =>
                            current.map((entry) =>
                              entry.productId === item.productId
                                ? {
                                    ...entry,
                                    quantity: Number(event.target.value),
                                  }
                                : entry,
                            ),
                          )
                        }
                        className="w-20 text-right"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        disabled={pending}
                        aria-label={`Remove ${product.name}`}
                        onClick={() =>
                          setItems((current) =>
                            current.filter(
                              (entry) => entry.productId !== item.productId,
                            ),
                          )
                        }
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      </div>
      <Card className="p-5 sm:p-6 xl:sticky xl:top-24">
        <div className="flex items-center gap-2">
          <ReceiptText className="size-4 text-primary" />
          <h2 className="text-sm font-semibold">A clear picture</h2>
          <Badge className="ml-auto text-[8px]">USD</Badge>
        </div>
        <p className="mt-2 text-[11px] leading-6 text-muted-foreground">
          Your monthly subscription summary.
        </p>
        <div className="my-6 space-y-4 border-y py-5">
          {items.length === 0 ? (
            <p className="py-3 text-center text-xs text-muted-foreground">
              Select a product to get started.
            </p>
          ) : (
            items.map((item) => {
              const product = products.find(
                (entry) => entry.id === item.productId,
              )!;
              return (
                <div
                  key={item.productId}
                  className="flex items-start justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <p className="break-words font-medium">{product.name}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {item.quantity} × {currency(price(product))}
                    </p>
                  </div>
                  <span className="shrink-0 font-medium">
                    {currency(price(product) * item.quantity)}
                  </span>
                </div>
              );
            })
          )}
        </div>
        <dl className="space-y-3 text-xs">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd>{currency(subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Tax (10%)</dt>
            <dd>{currency(tax)}</dd>
          </div>
          <div className="flex justify-between border-t pt-4 text-lg font-semibold">
            <dt>Estimated total</dt>
            <dd data-testid="checkout-total">{currency(total)}</dd>
          </div>
        </dl>
        {result && !result.success && (
          <div
            role="alert"
            aria-label="Checkout error"
            className="mt-5 rounded-lg border border-rose-100 bg-rose-50 px-3 py-3 text-xs leading-6 text-rose-700"
          >
            {result.message}
          </div>
        )}
        <Button
          type="submit"
          disabled={!valid || pending}
          className="mt-6 h-12 w-full"
        >
          {pending ? (
            <>
              <LoaderCircle className="animate-spin" />
              Creating subscription…
            </>
          ) : (
            <>
              Create subscription
              <ArrowRight />
            </>
          )}
        </Button>
        <p className="mt-4 text-center text-[10px] leading-6 text-muted-foreground">
          Creates an active monthly subscription and a draft invoice. No payment
          is collected. Final totals use current catalog prices.
        </p>
      </Card>
    </form>
  );
}
