import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { RoleGate } from "@/components/auth/role-gate";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/commerce/data-table";
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
import { createPlan, setPlanActive } from "@/actions/catalog";
import { requirePageUser } from "@/lib/auth/authorize";
import { getPlans, getProducts } from "@/lib/commerce/data";
import { formatDate, formatMoney } from "@/lib/commerce/format";
import { BILLING_PERIODS, periodLabel, titleCase } from "@/lib/commerce/rules";

export const metadata: Metadata = { title: "Plans" };

async function PlansData() {
  await connection();
  const user = await requirePageUser(["ADMIN", "STAFF"]);
  let data;
  try {
    const [plans, products] = await Promise.all([getPlans(), getProducts()]);
    data = { plans, products };
  } catch {
    return <WorkspaceUnavailable />;
  }
  const admin = user.role === "ADMIN";
  const flags = (plan: (typeof data.plans)[number]) =>
    [
      plan.autoClose && "auto-close",
      plan.closable && "closable",
      plan.pausable && "pausable",
      plan.renewable && "renewable",
    ].filter(Boolean) as string[];
  return (
    <div className={admin ? "grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]" : ""}>
      <div className="min-w-0">
        {data.plans.length === 0 ? (
          <Card className="p-8 text-center text-xs text-muted-foreground">
            No recurring plans yet.
          </Card>
        ) : (
          <DataTable
            caption="Recurring plans"
            columns={["Plan", "Price", "Min. qty", "Available", "Rules", "Active subs", ""]}
          >
            {data.plans.map((plan) => (
              <tr key={plan.id} className={plan.active ? "" : "opacity-60"}>
                <td className="px-5 py-4">
                  <span className="font-medium">{plan.name}</span>
                  <span className="block text-[10px] text-muted-foreground">{plan.product.name}</span>
                </td>
                <td className="px-5 py-4 whitespace-nowrap">
                  {formatMoney(plan.price)}/{periodLabel[plan.billingPeriod]}
                </td>
                <td className="px-5 py-4">{plan.minQuantity}</td>
                <td className="px-5 py-4 whitespace-nowrap text-muted-foreground">
                  {formatDate(plan.startDate)} – {plan.endDate ? formatDate(plan.endDate) : "open"}
                </td>
                <td className="px-5 py-4">
                  <span className="flex flex-wrap gap-1">
                    {flags(plan).map((flag) => (
                      <Badge key={flag} variant="secondary">{flag}</Badge>
                    ))}
                  </span>
                </td>
                <td className="px-5 py-4">{plan._count.subscriptions}</td>
                <td className="px-5 py-4">
                  {admin && (
                    <ActionButton
                      action={setPlanActive.bind(null, plan.id, !plan.active)}
                      label={plan.active ? "Close plan" : "Reopen"}
                      variant="ghost"
                    />
                  )}
                </td>
              </tr>
            ))}
          </DataTable>
        )}
      </div>
      {admin && (
        <Card className="p-5 sm:p-6">
          <h2 className="mb-4 text-sm font-semibold">New recurring plan</h2>
          <ActionForm action={createPlan} submitLabel="Create plan" ariaLabel="Create plan">
            <Field label="Plan name" htmlFor="plan-name">
              <Input id="plan-name" name="name" required maxLength={80} placeholder="CRM Monthly" />
            </Field>
            <Field label="Product" htmlFor="plan-product">
              <select id="plan-product" name="productId" required className={nativeSelect} defaultValue="">
                <option value="" disabled>Choose a product</option>
                {data.products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Price ($)" htmlFor="plan-price">
                <Input id="plan-price" name="price" type="number" step="0.01" min={0} required />
              </Field>
              <Field label="Billing period" htmlFor="plan-period">
                <select id="plan-period" name="billingPeriod" defaultValue="MONTHLY" className={nativeSelect}>
                  {BILLING_PERIODS.map((p) => (
                    <option key={p} value={p}>{titleCase(p)}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Minimum quantity" htmlFor="plan-min">
              <Input id="plan-min" name="minQuantity" type="number" min={1} max={999} defaultValue="1" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Available from" htmlFor="plan-start">
                <Input id="plan-start" name="startDate" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
              </Field>
              <Field label="Available until" htmlFor="plan-end" hint="Optional">
                <Input id="plan-end" name="endDate" type="date" />
              </Field>
            </div>
            <fieldset className="grid grid-cols-2 gap-2 text-xs">
              <legend className="mb-2 text-xs font-medium">Lifecycle rules</legend>
              {[
                ["autoClose", "Close automatically at expiry", false],
                ["closable", "Can be closed early", true],
                ["pausable", "Can be paused", true],
                ["renewable", "Can be renewed", true],
              ].map(([name, label, checked]) => (
                <label key={String(name)} className="flex items-center gap-2">
                  <input type="checkbox" name={String(name)} defaultChecked={Boolean(checked)} />
                  {label}
                </label>
              ))}
            </fieldset>
          </ActionForm>
        </Card>
      )}
    </div>
  );
}

export default function PlansPage() {
  return (
    <RoleGate roles={["ADMIN", "STAFF"]}>
      <div className="page-enter space-y-6">
        <WorkspaceHeading
          title="Recurring plans"
          description="What each product costs per billing period, its minimum quantity, availability dates, and whether it can be paused, closed early, renewed, or closes on its own."
          action="subscription"
        />
        <Suspense fallback={<Skeleton className="h-72 w-full" />}>
          <PlansData />
        </Suspense>
      </div>
    </RoleGate>
  );
}
