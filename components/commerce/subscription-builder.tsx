"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Plus, Trash2 } from "lucide-react";
import { createSubscription } from "@/actions/subscriptions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Field,
  ResultMessage,
  nativeSelect,
} from "@/components/commerce/action-controls";
import { formatMoney } from "@/lib/commerce/format";
import {
  BILLING_PERIODS,
  PAYMENT_TERMS,
  money,
  periodLabel,
  titleCase,
} from "@/lib/commerce/rules";

type Variant = { id: string; attribute: string; value: string; extraPrice: number };
type Options = {
  customers: { id: string; email: string; name: string | null }[];
  plans: {
    id: string;
    name: string;
    price: number;
    billingPeriod: string;
    minQuantity: number;
    productId: string;
    product: { name: string; variants: Variant[] };
  }[];
  products: {
    id: string;
    name: string;
    basePrice: number;
    variantName: string | null;
    markupPrice: number;
    variants: Variant[];
  }[];
  templates: {
    id: string;
    name: string;
    validityDays: number;
    planId: string;
    planQuantity: number;
    paymentTerms: string;
    lines: { productId: string; variantId: string | null; quantity: number }[];
  }[];
};
type Line = { key: string; productId: string; variantId: string; quantity: number };
const today = () => new Date().toISOString().slice(0, 10);

export function SubscriptionBuilder({ options }: { options: Options }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [customerId, setCustomerId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [planId, setPlanId] = useState("");
  const [planVariantId, setPlanVariantId] = useState("");
  const [planQuantity, setPlanQuantity] = useState(1);
  const [billingCycle, setBillingCycle] = useState("MONTHLY");
  const [lines, setLines] = useState<Line[]>([]);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("Net 30");
  const [status, setStatus] = useState<"DRAFT" | "QUOTATION">("QUOTATION");
  const [validityDays, setValidityDays] = useState(30);
  const [notes, setNotes] = useState("");
  const plan = options.plans.find((p) => p.id === planId);
  const template = options.templates.find((t) => t.id === templateId);

  function applyTemplate(id: string) {
    setTemplateId(id);
    const chosen = options.templates.find((t) => t.id === id);
    if (!chosen) return;
    setPlanId(chosen.planId);
    setPlanVariantId("");
    setPlanQuantity(chosen.planQuantity);
    setPaymentTerms(chosen.paymentTerms);
    setStatus("QUOTATION");
    setLines(
      chosen.lines.map((line) => ({
        key: crypto.randomUUID(),
        productId: line.productId,
        variantId: line.variantId ?? "",
        quantity: line.quantity,
      })),
    );
  }
  const estimate = useMemo(() => {
    let total = 0;
    if (plan) {
      const variant = plan.product.variants.find((v) => v.id === planVariantId);
      total += (plan.price + (variant?.extraPrice ?? 0)) * planQuantity;
    }
    for (const line of lines) {
      const product = options.products.find((p) => p.id === line.productId);
      if (!product) continue;
      const variant = product.variants.find((v) => v.id === line.variantId);
      total +=
        (product.basePrice +
          (product.variantName ? product.markupPrice : 0) +
          (variant?.extraPrice ?? 0)) *
        line.quantity;
    }
    return money(total);
  }, [plan, planVariantId, planQuantity, lines, options.products]);
  const cycle = plan?.billingPeriod ?? billingCycle;
  const valid =
    customerId &&
    (plan || lines.length > 0) &&
    lines.every((l) => l.productId && l.quantity >= 1 && l.quantity <= 999) &&
    (!plan || planQuantity >= plan.minQuantity);

  return (
    <form
      aria-label="New subscription"
      className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]"
      onSubmit={(event) => {
        event.preventDefault();
        if (!valid || pending) return;
        setResult(null);
        startTransition(async () => {
          try {
            const response = await createSubscription({
              customerId,
              ...(templateId && { templateId }),
              ...(planId && { planId, planQuantity }),
              ...(planVariantId && { planVariantId }),
              ...(!planId && { billingCycle: billingCycle as "MONTHLY" }),
              lines: lines.map((l) => ({
                productId: l.productId,
                ...(l.variantId && { variantId: l.variantId }),
                quantity: l.quantity,
              })),
              startDate,
              ...(endDate && { endDate }),
              paymentTerms,
              status,
              ...(!templateId && { validityDays }),
              notes,
            });
            setResult(response);
            if (response.success && response.id)
              router.push(`/subscriptions/${response.id}`);
          } catch {
            setResult({ success: false, message: "We couldn’t reach the server. Please try again." });
          }
        });
      }}
    >
      <fieldset disabled={pending} className="space-y-6">
        <Card className="space-y-4 p-5 sm:p-6">
          <h2 className="text-sm font-semibold">Customer and starting point</h2>
          <Field label="Customer" htmlFor="sub-customer">
            <select
              id="sub-customer"
              className={nativeSelect}
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              required
            >
              <option value="">Select a customer</option>
              {options.customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name ? `${c.name} — ${c.email}` : c.email}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Quotation template"
            htmlFor="sub-template"
            hint={template ? `Valid for ${template.validityDays} days once sent.` : "Optional: prefills plan, lines, and terms."}
          >
            <select
              id="sub-template"
              className={nativeSelect}
              value={templateId}
              onChange={(e) => applyTemplate(e.target.value)}
            >
              <option value="">No template</option>
              {options.templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
        </Card>
        <Card className="space-y-4 p-5 sm:p-6">
          <h2 className="text-sm font-semibold">Plan</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Recurring plan" htmlFor="sub-plan">
              <select
                id="sub-plan"
                className={nativeSelect}
                value={planId}
                onChange={(e) => {
                  setPlanId(e.target.value);
                  setPlanVariantId("");
                  const next = options.plans.find((p) => p.id === e.target.value);
                  setPlanQuantity(Math.max(1, next?.minQuantity ?? 1));
                }}
              >
                <option value="">No plan — products only</option>
                {options.plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {formatMoney(p.price)}/{periodLabel[p.billingPeriod]}
                  </option>
                ))}
              </select>
            </Field>
            {plan ? (
              <Field
                label="Plan quantity"
                htmlFor="sub-plan-qty"
                hint={`Minimum ${plan.minQuantity}`}
              >
                <Input
                  id="sub-plan-qty"
                  type="number"
                  min={plan.minQuantity}
                  max={999}
                  value={planQuantity}
                  onChange={(e) => setPlanQuantity(Number(e.target.value))}
                />
              </Field>
            ) : (
              <Field label="Billing period" htmlFor="sub-cycle">
                <select
                  id="sub-cycle"
                  className={nativeSelect}
                  value={billingCycle}
                  onChange={(e) => setBillingCycle(e.target.value)}
                >
                  {BILLING_PERIODS.map((p) => (
                    <option key={p} value={p}>
                      {titleCase(p)}
                    </option>
                  ))}
                </select>
              </Field>
            )}
          </div>
          {plan && plan.product.variants.length > 0 && (
            <Field label="Plan variant" htmlFor="sub-plan-variant">
              <select
                id="sub-plan-variant"
                className={nativeSelect}
                value={planVariantId}
                onChange={(e) => setPlanVariantId(e.target.value)}
              >
                <option value="">Standard</option>
                {plan.product.variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.attribute}: {v.value} (+{formatMoney(v.extraPrice)})
                  </option>
                ))}
              </select>
            </Field>
          )}
        </Card>
        <Card className="space-y-4 p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Add-on products</h2>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={options.products.length === 0}
              onClick={() =>
                setLines((current) => [
                  ...current,
                  { key: crypto.randomUUID(), productId: "", variantId: "", quantity: 1 },
                ])
              }
            >
              <Plus /> Add product
            </Button>
          </div>
          {lines.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No add-ons. Each add-on bills at its sales price every period.
            </p>
          )}
          {lines.map((line, index) => {
            const product = options.products.find((p) => p.id === line.productId);
            const update = (patch: Partial<Line>) =>
              setLines((current) =>
                current.map((l) => (l.key === line.key ? { ...l, ...patch } : l)),
              );
            return (
              <div key={line.key} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_90px_auto]">
                <select
                  aria-label={`Product ${index + 1}`}
                  className={nativeSelect}
                  value={line.productId}
                  onChange={(e) => update({ productId: e.target.value, variantId: "" })}
                  required
                >
                  <option value="">Choose a product</option>
                  {options.products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {formatMoney(p.basePrice + (p.variantName ? p.markupPrice : 0))}
                    </option>
                  ))}
                </select>
                <select
                  aria-label={`Variant ${index + 1}`}
                  className={nativeSelect}
                  value={line.variantId}
                  onChange={(e) => update({ variantId: e.target.value })}
                  disabled={!product?.variants.length}
                >
                  <option value="">Standard</option>
                  {product?.variants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.attribute}: {v.value} (+{formatMoney(v.extraPrice)})
                    </option>
                  ))}
                </select>
                <Input
                  aria-label={`Quantity ${index + 1}`}
                  type="number"
                  min={1}
                  max={999}
                  value={line.quantity}
                  onChange={(e) => update({ quantity: Number(e.target.value) })}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove product ${index + 1}`}
                  onClick={() => setLines((current) => current.filter((l) => l.key !== line.key))}
                >
                  <Trash2 />
                </Button>
              </div>
            );
          })}
        </Card>
        <Card className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
          <h2 className="text-sm font-semibold sm:col-span-2">Terms</h2>
          <Field label="Start date" htmlFor="sub-start">
            <Input id="sub-start" type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </Field>
          <Field label="Expiry date" htmlFor="sub-end" hint="Optional. Defaults to one year after the start.">
            <Input id="sub-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </Field>
          <Field label="Payment terms" htmlFor="sub-terms">
            <select id="sub-terms" className={nativeSelect} value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)}>
              {Object.keys(PAYMENT_TERMS).map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Save as" htmlFor="sub-status">
            <select
              id="sub-status"
              className={nativeSelect}
              value={status}
              onChange={(e) => setStatus(e.target.value as "DRAFT" | "QUOTATION")}
            >
              <option value="QUOTATION">Quotation (sent to customer)</option>
              <option value="DRAFT">Draft</option>
            </select>
          </Field>
          {status === "QUOTATION" && !template && (
            <Field label="Quotation validity (days)" htmlFor="sub-validity">
              <Input id="sub-validity" type="number" min={1} max={365} value={validityDays} onChange={(e) => setValidityDays(Number(e.target.value))} />
            </Field>
          )}
          <div className="sm:col-span-2">
            <Field label="Notes" htmlFor="sub-notes">
              <textarea
                id="sub-notes"
                rows={2}
                maxLength={500}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-lg border bg-white px-3 py-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </Field>
          </div>
        </Card>
      </fieldset>
      <Card className="space-y-4 p-5 xl:sticky xl:top-24">
        <h2 className="text-sm font-semibold">Summary</h2>
        <p className="text-xs text-muted-foreground">
          Estimated recurring amount before tax and discounts. Final prices,
          taxes, and discounts are calculated on the server.
        </p>
        <p className="text-2xl font-semibold" data-testid="subscription-estimate">
          {formatMoney(estimate)}
          <span className="text-xs font-normal text-muted-foreground"> /{periodLabel[cycle]}</span>
        </p>
        <ResultMessage result={result} label="Subscription result" />
        <Button type="submit" className="w-full" disabled={!valid || pending}>
          {pending && <LoaderCircle className="animate-spin" />}
          {status === "QUOTATION" ? "Save quotation" : "Save draft"}
        </Button>
      </Card>
    </form>
  );
}
