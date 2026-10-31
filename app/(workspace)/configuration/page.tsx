import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
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
  WorkspaceHeading,
  WorkspaceUnavailable,
} from "@/components/commerce/workspace-states";
import {
  createDiscountRule,
  createQuotationTemplate,
  createTaxRule,
  setDefaultTaxRule,
  setDiscountActive,
  setTaxRuleActive,
  setTemplateActive,
} from "@/actions/catalog";
import { getConfiguration } from "@/lib/commerce/data";
import { formatDate, formatMoney } from "@/lib/commerce/format";
import { PAYMENT_TERMS } from "@/lib/commerce/rules";

export const metadata: Metadata = { title: "Configuration" };
const today = () => new Date().toISOString().slice(0, 10);

async function ConfigurationData() {
  await connection();
  let config;
  try {
    config = await getConfiguration();
  } catch {
    return <WorkspaceUnavailable />;
  }
  const now = new Date();
  return (
    <div className="space-y-8">
      <section aria-labelledby="taxes" className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="p-5 sm:p-6">
          <h2 id="taxes" className="text-sm font-semibold">Tax rules</h2>
          <p className="mt-1 text-[11px] text-muted-foreground">
            A product uses its own tax rule, or the default. The rate is saved on each subscription line when it’s created.
          </p>
          <div className="mt-4 divide-y rounded-lg border">
            {config.taxRules.length === 0 && <p className="p-4 text-xs text-muted-foreground">No tax rules yet. The 10% engine default applies.</p>}
            {config.taxRules.map((rule) => (
              <div key={rule.id} className={`flex flex-wrap items-center justify-between gap-2 p-3 text-xs ${rule.active ? "" : "opacity-60"}`}>
                <span>
                  <strong>{rule.name}</strong> · {rule.rate}% · {rule._count.products} product{rule._count.products === 1 ? "" : "s"}
                  {rule.isDefault && <Badge className="ml-2">Default</Badge>}
                </span>
                <span className="flex gap-2">
                  {rule.active && !rule.isDefault && (
                    <ActionButton action={setDefaultTaxRule.bind(null, rule.id)} label="Make default" variant="ghost" />
                  )}
                  <ActionButton action={setTaxRuleActive.bind(null, rule.id, !rule.active)} label={rule.active ? "Deactivate" : "Restore"} variant="ghost" />
                </span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold">New tax rule</h3>
          <ActionForm action={createTaxRule} submitLabel="Create tax rule" ariaLabel="Create tax rule">
            <Field label="Name" htmlFor="tax-name">
              <Input id="tax-name" name="name" required maxLength={60} placeholder="GST 18%" />
            </Field>
            <Field label="Rate (%)" htmlFor="tax-rate">
              <Input id="tax-rate" name="rate" type="number" step="0.01" min={0} max={100} required />
            </Field>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" name="isDefault" /> Make this the default
            </label>
          </ActionForm>
        </Card>
      </section>

      <section aria-labelledby="discounts" className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="p-5 sm:p-6">
          <h2 id="discounts" className="text-sm font-semibold">Discount rules</h2>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Applied automatically to new invoices when eligible. When several apply, the largest discount wins. A rule stops at its end date or usage limit.
          </p>
          <div className="mt-4 divide-y rounded-lg border">
            {config.discounts.length === 0 && <p className="p-4 text-xs text-muted-foreground">No discounts yet.</p>}
            {config.discounts.map((rule) => {
              const live = rule.active && rule.startDate <= now && rule.endDate >= now && (rule.usageLimit === null || rule.usedCount < rule.usageLimit);
              return (
                <div key={rule.id} className={`flex flex-wrap items-center justify-between gap-2 p-3 text-xs ${rule.active ? "" : "opacity-60"}`}>
                  <span className="space-y-1">
                    <span className="block">
                      <strong>{rule.name}</strong> · {rule.type === "PERCENTAGE" ? `${rule.value}%` : formatMoney(rule.value)} off
                      {rule.product ? ` ${rule.product.name}` : " whole subscription"}
                      <Badge variant={live ? "success" : "secondary"} className="ml-2">{live ? "Applying" : "Not applying"}</Badge>
                    </span>
                    <span className="block text-[10px] text-muted-foreground">
                      {formatDate(rule.startDate)} – {formatDate(rule.endDate)}
                      {rule.minQuantity > 0 && ` · min qty ${rule.minQuantity}`}
                      {rule.minPurchase > 0 && ` · min purchase ${formatMoney(rule.minPurchase)}`}
                      {` · used ${rule.usedCount}${rule.usageLimit !== null ? ` / ${rule.usageLimit}` : ""}`}
                    </span>
                  </span>
                  <ActionButton action={setDiscountActive.bind(null, rule.id, !rule.active)} label={rule.active ? "Deactivate" : "Reactivate"} variant="ghost" />
                </div>
              );
            })}
          </div>
        </Card>
        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold">New discount</h3>
          <ActionForm action={createDiscountRule} submitLabel="Create discount" ariaLabel="Create discount">
            <Field label="Name" htmlFor="disc-name">
              <Input id="disc-name" name="name" required maxLength={80} placeholder="Volume 10+ seats" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type" htmlFor="disc-type">
                <select id="disc-type" name="type" className={nativeSelect} defaultValue="PERCENTAGE">
                  <option value="PERCENTAGE">Percentage</option>
                  <option value="FIXED">Fixed amount</option>
                </select>
              </Field>
              <Field label="Value" htmlFor="disc-value">
                <Input id="disc-value" name="value" type="number" step="0.01" min={0.01} required />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Min. quantity" htmlFor="disc-qty">
                <Input id="disc-qty" name="minQuantity" type="number" min={0} defaultValue="0" />
              </Field>
              <Field label="Min. purchase ($)" htmlFor="disc-purchase">
                <Input id="disc-purchase" name="minPurchase" type="number" step="0.01" min={0} defaultValue="0" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Starts" htmlFor="disc-start">
                <Input id="disc-start" name="startDate" type="date" required defaultValue={today()} />
              </Field>
              <Field label="Ends" htmlFor="disc-end">
                <Input id="disc-end" name="endDate" type="date" required />
              </Field>
            </div>
            <Field label="Usage limit" htmlFor="disc-limit" hint="Leave empty for unlimited.">
              <Input id="disc-limit" name="usageLimit" type="number" min={1} />
            </Field>
            <Field label="Applies to" htmlFor="disc-product">
              <select id="disc-product" name="productId" className={nativeSelect} defaultValue="">
                <option value="">Whole subscription</option>
                {config.products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} only</option>
                ))}
              </select>
            </Field>
          </ActionForm>
        </Card>
      </section>

      <section aria-labelledby="templates" className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="p-5 sm:p-6">
          <h2 id="templates" className="text-sm font-semibold">Quotation templates</h2>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Start a quotation with the right plan and lines already filled in. It stays valid for the template’s number of days.
          </p>
          <div className="mt-4 divide-y rounded-lg border">
            {config.templates.length === 0 && <p className="p-4 text-xs text-muted-foreground">No templates yet.</p>}
            {config.templates.map((template) => (
              <div key={template.id} className={`flex flex-wrap items-center justify-between gap-2 p-3 text-xs ${template.active ? "" : "opacity-60"}`}>
                <span>
                  <strong>{template.name}</strong> · {template.plan.name} × {template.planQuantity} · valid {template.validityDays} days · {template.paymentTerms}
                  <span className="block text-[10px] text-muted-foreground">
                    {template.lines.map((l) => `${l.product.name} × ${l.quantity}`).join(", ") || "No add-ons"}
                  </span>
                </span>
                <ActionButton action={setTemplateActive.bind(null, template.id, !template.active)} label={template.active ? "Archive" : "Restore"} variant="ghost" />
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold">New template</h3>
          <ActionForm action={createQuotationTemplate} submitLabel="Create template" ariaLabel="Create quotation template">
            <Field label="Name" htmlFor="tpl-name">
              <Input id="tpl-name" name="name" required maxLength={80} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Plan" htmlFor="tpl-plan">
                <select id="tpl-plan" name="planId" className={nativeSelect} required defaultValue="">
                  <option value="" disabled>Choose</option>
                  {config.plans.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Plan quantity" htmlFor="tpl-qty">
                <Input id="tpl-qty" name="planQuantity" type="number" min={1} defaultValue="1" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Valid for (days)" htmlFor="tpl-days">
                <Input id="tpl-days" name="validityDays" type="number" min={1} max={365} defaultValue="30" required />
              </Field>
              <Field label="Payment terms" htmlFor="tpl-terms">
                <select id="tpl-terms" name="paymentTerms" className={nativeSelect} defaultValue="Net 30">
                  {Object.keys(PAYMENT_TERMS).map((t) => <option key={t}>{t}</option>)}
                </select>
              </Field>
            </div>
            {[1, 2, 3].map((n) => (
              <div key={n} className="grid grid-cols-[1fr_70px] gap-2">
                <select name="lineProductId" aria-label={`Template line ${n} product`} className={nativeSelect} defaultValue="">
                  <option value="">Add-on {n} (optional)</option>
                  {config.products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <Input name="lineQuantity" aria-label={`Template line ${n} quantity`} type="number" min={1} defaultValue="1" />
              </div>
            ))}
          </ActionForm>
        </Card>
      </section>
    </div>
  );
}

export default function ConfigurationPage() {
  return (
    <RoleGate roles={["ADMIN"]}>
      <div className="page-enter space-y-6">
        <WorkspaceHeading
          title="Billing configuration"
          description="Taxes, discounts, and quotation templates. Only administrators can change these."
          action="none"
        />
        <Suspense fallback={<Skeleton className="h-96 w-full" />}>
          <ConfigurationData />
        </Suspense>
      </div>
    </RoleGate>
  );
}
