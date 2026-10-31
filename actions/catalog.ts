"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { BILLING_PERIODS, PAYMENT_TERMS } from "@/lib/commerce/rules";
import {
  denied,
  fail,
  guard,
  refresh,
  type ActionResult,
} from "@/lib/commerce/guard";

// Plans, taxes, discounts, and quotation templates are administrator configuration.
const ADMIN = ["ADMIN"] as const;
const amount = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/)
  .transform(Number)
  .refine((value) => value <= 1_000_000);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const optionalDay = z.union([z.literal(""), day]);
const uuid = z.string().uuid();
const toDate = (value: string) => new Date(`${value}T00:00:00Z`);
const checked = (formData: FormData, name: string) => formData.get(name) === "on";

const planSchema = z.object({
  name: z.string().trim().min(1).max(80),
  productId: uuid,
  price: amount,
  billingPeriod: z.enum(BILLING_PERIODS),
  minQuantity: z.coerce.number().int().min(1).max(999),
  startDate: day,
  endDate: optionalDay,
});
export async function createPlan(formData: FormData): Promise<ActionResult> {
  const user = await guard(ADMIN);
  if (denied(user)) return user;
  const input = planSchema.safeParse({
    name: formData.get("name"),
    productId: formData.get("productId"),
    price: formData.get("price"),
    billingPeriod: formData.get("billingPeriod"),
    minQuantity: formData.get("minQuantity") || "1",
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate") ?? "",
  });
  if (!input.success)
    return fail("Enter a name, product, price, billing period, minimum quantity, and start date.");
  if (input.data.endDate && input.data.endDate <= input.data.startDate)
    return fail("The plan must end after it starts.");
  if (!(await prisma.product.findFirst({ where: { id: input.data.productId, active: true } })))
    return fail("Choose an active product.");
  await prisma.plan.create({
    data: {
      ...input.data,
      startDate: toDate(input.data.startDate),
      endDate: input.data.endDate ? toDate(input.data.endDate) : null,
      autoClose: checked(formData, "autoClose"),
      closable: checked(formData, "closable"),
      pausable: checked(formData, "pausable"),
      renewable: checked(formData, "renewable"),
    },
  });
  refresh("/plans", "/subscriptions/new");
  return { success: true, message: `Plan ${input.data.name} created.` };
}
export async function setPlanActive(planId: string, active: boolean): Promise<ActionResult> {
  const user = await guard(ADMIN);
  if (denied(user)) return user;
  if (!uuid.safeParse(planId).success) return fail("Plan not found.");
  const updated = await prisma.plan.updateMany({
    where: { id: planId },
    data: { active: active === true },
  });
  if (!updated.count) return fail("Plan not found.");
  refresh("/plans", "/subscriptions/new");
  return { success: true, message: active ? "Plan reopened." : "Plan closed to new subscriptions." };
}

const taxSchema = z.object({
  name: z.string().trim().min(1).max(60),
  rate: amount.refine((rate) => rate <= 100),
});
export async function createTaxRule(formData: FormData): Promise<ActionResult> {
  const user = await guard(ADMIN);
  if (denied(user)) return user;
  const input = taxSchema.safeParse({
    name: formData.get("name"),
    rate: formData.get("rate"),
  });
  if (!input.success) return fail("Enter a name and a rate from 0 to 100%.");
  const isDefault = checked(formData, "isDefault");
  await prisma.$transaction(async (tx) => {
    if (isDefault) await tx.taxRule.updateMany({ data: { isDefault: false } });
    await tx.taxRule.create({ data: { ...input.data, isDefault } });
  });
  refresh("/configuration", "/products");
  return { success: true, message: `Tax rule ${input.data.name} created.` };
}
export async function setDefaultTaxRule(taxRuleId: string): Promise<ActionResult> {
  const user = await guard(ADMIN);
  if (denied(user)) return user;
  if (!uuid.safeParse(taxRuleId).success) return fail("Tax rule not found.");
  await prisma.$transaction([
    prisma.taxRule.updateMany({ data: { isDefault: false } }),
    prisma.taxRule.updateMany({
      where: { id: taxRuleId },
      data: { isDefault: true, active: true },
    }),
  ]);
  refresh("/configuration");
  return { success: true, message: "Default tax rule updated for new subscription lines." };
}
export async function setTaxRuleActive(taxRuleId: string, active: boolean): Promise<ActionResult> {
  const user = await guard(ADMIN);
  if (denied(user)) return user;
  if (!uuid.safeParse(taxRuleId).success) return fail("Tax rule not found.");
  await prisma.taxRule.updateMany({
    where: { id: taxRuleId },
    data: active ? { active: true } : { active: false, isDefault: false },
  });
  refresh("/configuration");
  return { success: true, message: active ? "Tax rule restored." : "Tax rule deactivated." };
}

const discountSchema = z.object({
  name: z.string().trim().min(1).max(80),
  type: z.enum(["FIXED", "PERCENTAGE"]),
  value: amount.refine((value) => value > 0),
  minQuantity: z.coerce.number().int().min(0).max(100_000),
  minPurchase: amount,
  startDate: day,
  endDate: day,
  usageLimit: z.union([z.literal(""), z.coerce.number().int().min(1).max(1_000_000)]),
  productId: z.union([z.literal(""), uuid]),
});
export async function createDiscountRule(formData: FormData): Promise<ActionResult> {
  const user = await guard(ADMIN);
  if (denied(user)) return user;
  const input = discountSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    value: formData.get("value"),
    minQuantity: formData.get("minQuantity") || "0",
    minPurchase: formData.get("minPurchase") || "0",
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    usageLimit: formData.get("usageLimit") ?? "",
    productId: formData.get("productId") ?? "",
  });
  if (!input.success)
    return fail("Enter a name, type, positive value, and valid dates and limits.");
  const data = input.data;
  if (data.type === "PERCENTAGE" && data.value > 100)
    return fail("A percentage discount can’t exceed 100%.");
  if (data.endDate < data.startDate) return fail("The discount must end after it starts.");
  if (data.productId && !(await prisma.product.findUnique({ where: { id: data.productId } })))
    return fail("Choose a valid product.");
  await prisma.discountRule.create({
    data: {
      ...data,
      startDate: toDate(data.startDate),
      // The rule stays valid through the whole end day.
      endDate: new Date(`${data.endDate}T23:59:59Z`),
      usageLimit: data.usageLimit === "" ? null : data.usageLimit,
      productId: data.productId || null,
    },
  });
  refresh("/configuration");
  return { success: true, message: `Discount ${data.name} created. It applies automatically to eligible new invoices.` };
}
export async function setDiscountActive(ruleId: string, active: boolean): Promise<ActionResult> {
  const user = await guard(ADMIN);
  if (denied(user)) return user;
  if (!uuid.safeParse(ruleId).success) return fail("Discount not found.");
  await prisma.discountRule.updateMany({
    where: { id: ruleId },
    data: { active: active === true },
  });
  refresh("/configuration");
  return { success: true, message: active ? "Discount reactivated." : "Discount deactivated." };
}

const templateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  validityDays: z.coerce.number().int().min(1).max(365),
  planId: uuid,
  planQuantity: z.coerce.number().int().min(1).max(999),
  paymentTerms: z.string().refine((terms) => terms in PAYMENT_TERMS),
  notes: z.string().trim().max(500),
  lines: z
    .array(z.object({ productId: uuid, quantity: z.coerce.number().int().min(1).max(999) }))
    .max(20),
});
export async function createQuotationTemplate(formData: FormData): Promise<ActionResult> {
  const user = await guard(ADMIN);
  if (denied(user)) return user;
  const productIds = formData.getAll("lineProductId").map(String);
  const quantities = formData.getAll("lineQuantity").map(String);
  const input = templateSchema.safeParse({
    name: formData.get("name"),
    validityDays: formData.get("validityDays"),
    planId: formData.get("planId"),
    planQuantity: formData.get("planQuantity") || "1",
    paymentTerms: formData.get("paymentTerms"),
    notes: formData.get("notes") ?? "",
    lines: productIds
      .map((productId, i) => ({ productId, quantity: quantities[i] || "1" }))
      .filter((line) => line.productId),
  });
  if (!input.success)
    return fail("Enter a name, validity (1–365 days), plan, payment terms, and valid lines.");
  const plan = await prisma.plan.findFirst({ where: { id: input.data.planId, active: true } });
  if (!plan) return fail("Choose an active plan.");
  if (input.data.planQuantity < plan.minQuantity)
    return fail(`This plan needs a quantity of at least ${plan.minQuantity}.`);
  const ids = input.data.lines.map((line) => line.productId);
  if (new Set(ids).size !== ids.length) return fail("Each product can appear once.");
  if ((await prisma.product.count({ where: { id: { in: ids }, active: true } })) !== ids.length)
    return fail("A template product is no longer available.");
  const { lines, ...template } = input.data;
  await prisma.quotationTemplate.create({
    data: { ...template, notes: template.notes || null, lines: { create: lines } },
  });
  refresh("/configuration", "/subscriptions/new");
  return { success: true, message: `Quotation template ${template.name} created.` };
}
export async function setTemplateActive(templateId: string, active: boolean): Promise<ActionResult> {
  const user = await guard(ADMIN);
  if (denied(user)) return user;
  if (!uuid.safeParse(templateId).success) return fail("Template not found.");
  await prisma.quotationTemplate.updateMany({
    where: { id: templateId },
    data: { active: active === true },
  });
  refresh("/configuration", "/subscriptions/new");
  return { success: true, message: active ? "Template reactivated." : "Template archived." };
}
