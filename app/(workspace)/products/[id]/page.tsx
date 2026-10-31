import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";
import { ArrowLeft } from "lucide-react";
import { RoleGate } from "@/components/auth/role-gate";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ActionButton,
  ActionForm,
  Field,
  nativeSelect,
} from "@/components/commerce/action-controls";
import {
  addVariant,
  setProductActive,
  setVariantActive,
  updateProduct,
} from "@/actions/products";
import { requirePageUser } from "@/lib/auth/authorize";
import { getProductDetail, getTaxRules } from "@/lib/commerce/data";
import { formatMoney } from "@/lib/commerce/format";
import { PRODUCT_TYPES, periodLabel, titleCase } from "@/lib/commerce/rules";

export const metadata: Metadata = { title: "Product" };

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const user = await requirePageUser(["ADMIN", "STAFF"]);
  const { id } = await params;
  const [product, taxRules] = /^[0-9a-f-]{36}$/i.test(id)
    ? await Promise.all([getProductDetail(id), getTaxRules()])
    : [null, []];
  if (!product) notFound();
  const admin = user.role === "ADMIN";
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/products"
            className="mb-3 flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="size-3" /> Catalog
          </Link>
          <h1 className="flex flex-wrap items-center gap-3 text-2xl font-semibold tracking-tight">
            {product.name}
            {!product.active && <Badge variant="warning">Archived</Badge>}
          </h1>
          <p className="mt-2 text-xs text-muted-foreground">
            {titleCase(product.type)} · Sales price {formatMoney(product.basePrice)} ·
            Used on {product._count.subscriptionLines} subscription line
            {product._count.subscriptionLines === 1 ? "" : "s"}
          </p>
        </div>
        {admin && (
          <ActionButton
            action={setProductActive.bind(null, product.id, !product.active)}
            label={product.active ? "Archive product" : "Restore product"}
            confirm={
              product.active
                ? "Archive this product? Existing subscriptions keep billing; it won’t be offered for new ones."
                : undefined
            }
          />
        )}
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-2">
        {admin && (
          <Card className="p-5 sm:p-6">
            <h2 className="mb-4 text-sm font-semibold">Edit product</h2>
            <ActionForm
              action={updateProduct}
              submitLabel="Save changes"
              ariaLabel="Edit product"
              resetOnSuccess={false}
            >
              <input type="hidden" name="id" value={product.id} />
              <Field label="Name" htmlFor="edit-name">
                <Input id="edit-name" name="name" defaultValue={product.name} required maxLength={80} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Type" htmlFor="edit-type">
                  <select id="edit-type" name="type" defaultValue={product.type} className={nativeSelect}>
                    {PRODUCT_TYPES.map((t) => (
                      <option key={t} value={t}>{titleCase(t)}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Tax rule" htmlFor="edit-tax">
                  <select id="edit-tax" name="taxRuleId" defaultValue={product.taxRuleId ?? ""} className={nativeSelect}>
                    <option value="">Default</option>
                    {taxRules.map((r) => (
                      <option key={r.id} value={r.id}>{r.name} ({r.rate}%)</option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Sales price ($)" htmlFor="edit-price">
                  <Input id="edit-price" name="basePrice" type="number" step="0.01" min={0} defaultValue={product.basePrice} required />
                </Field>
                <Field label="Cost price ($)" htmlFor="edit-cost">
                  <Input id="edit-cost" name="costPrice" type="number" step="0.01" min={0} defaultValue={product.costPrice} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Legacy variant name" htmlFor="edit-variant" hint="Always added when set.">
                  <Input id="edit-variant" name="variantName" defaultValue={product.variantName ?? ""} maxLength={80} />
                </Field>
                <Field label="Legacy markup ($)" htmlFor="edit-markup">
                  <Input id="edit-markup" name="markupPrice" type="number" step="0.01" min={0} defaultValue={product.markupPrice} />
                </Field>
              </div>
              <Field label="Notes" htmlFor="edit-notes">
                <textarea
                  id="edit-notes"
                  name="notes"
                  rows={3}
                  maxLength={500}
                  defaultValue={product.notes ?? ""}
                  className="w-full rounded-lg border bg-white px-3 py-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </Field>
            </ActionForm>
          </Card>
        )}
        <div className="space-y-6">
          <Card className="p-5 sm:p-6">
            <h2 className="text-sm font-semibold">Variants</h2>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Choosing a variant adds its extra price to the unit price.
            </p>
            <div className="mt-4 divide-y rounded-lg border">
              {product.variants.length === 0 && (
                <p className="p-4 text-xs text-muted-foreground">No variants yet.</p>
              )}
              {product.variants.map((variant) => (
                <div key={variant.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-xs">
                  <span className={variant.active ? "" : "text-muted-foreground line-through"}>
                    {variant.attribute}: <strong>{variant.value}</strong> · +{formatMoney(variant.extraPrice)}
                  </span>
                  {admin && (
                    <ActionButton
                      action={setVariantActive.bind(null, variant.id, !variant.active)}
                      label={variant.active ? "Archive" : "Restore"}
                      variant="ghost"
                    />
                  )}
                </div>
              ))}
            </div>
            {admin && (
              <ActionForm action={addVariant} submitLabel="Add variant" ariaLabel="Add variant" className="mt-5">
                <input type="hidden" name="productId" value={product.id} />
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Attribute" htmlFor="variant-attribute">
                    <Input id="variant-attribute" name="attribute" placeholder="Brand" required maxLength={40} />
                  </Field>
                  <Field label="Value" htmlFor="variant-value">
                    <Input id="variant-value" name="value" placeholder="Odoo" required maxLength={60} />
                  </Field>
                  <Field label="Extra price ($)" htmlFor="variant-extra">
                    <Input id="variant-extra" name="extraPrice" type="number" step="0.01" min={0} defaultValue="0" />
                  </Field>
                </div>
              </ActionForm>
            )}
          </Card>
          <Card className="p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Recurring plans</h2>
              <Link href="/plans" className="text-[11px] font-medium text-primary hover:underline">
                {admin ? "Create a plan" : "All plans"}
              </Link>
            </div>
            <ul className="mt-3 space-y-2 text-xs">
              {product.plans.length === 0 && <li className="text-muted-foreground">No plans for this product.</li>}
              {product.plans.map((plan) => (
                <li key={plan.id} className={plan.active ? "" : "text-muted-foreground"}>
                  {plan.name} · {formatMoney(plan.price)}/{periodLabel[plan.billingPeriod]}
                  {!plan.active && " (closed)"}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function ProductPage(props: { params: Promise<{ id: string }> }) {
  return (
    <RoleGate roles={["ADMIN", "STAFF"]}>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <Detail params={props.params} />
      </Suspense>
    </RoleGate>
  );
}
