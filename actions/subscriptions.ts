"use server";

import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { OPERATORS } from "@/lib/auth/roles";
import {
  billSubscription,
  defaultTaxRate,
  taxRateFor,
  unitPriceFor,
} from "@/lib/commerce/engine";
import {
  BILLING_PERIODS,
  PAYMENT_TERMS,
  addDays,
  addPeriod,
  allowedActions,
  nextStatus,
  startOfUtcDay,
  type LifecycleAction,
} from "@/lib/commerce/rules";
import {
  denied,
  fail,
  guard,
  refresh,
  type ActionResult,
} from "@/lib/commerce/guard";

const id = z.string().uuid();
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const schema = z.object({
  customerId: id,
  planId: id.optional(),
  planQuantity: z.number().int().min(1).max(999).optional(),
  planVariantId: id.optional(),
  templateId: id.optional(),
  billingCycle: z.enum(BILLING_PERIODS).optional(),
  lines: z
    .array(
      z.object({
        productId: id,
        variantId: id.optional(),
        quantity: z.number().int().min(1).max(999),
      }),
    )
    .max(50),
  startDate: day,
  endDate: day.optional(),
  paymentTerms: z
    .string()
    .refine((terms) => terms in PAYMENT_TERMS, "Unknown payment terms"),
  validityDays: z.number().int().min(1).max(365).optional(),
  status: z.enum(["DRAFT", "QUOTATION"]),
  notes: z.string().trim().max(500).optional(),
});
export type NewSubscriptionInput = z.input<typeof schema>;

async function nextReference(tx: Prisma.TransactionClient) {
  const latest = await tx.subscription.findFirst({
    where: { planNumber: { startsWith: "SUB-" } },
    orderBy: { planNumber: "desc" },
    select: { planNumber: true },
  });
  const n = latest ? Number(latest.planNumber.slice(4)) + 1 : 1;
  return `SUB-${String(Number.isFinite(n) ? n : 1).padStart(5, "0")}`;
}

/** Operators draft a subscription or quotation. Prices come from the catalog and plan, never the client. */
export async function createSubscription(
  input: NewSubscriptionInput,
): Promise<ActionResult> {
  const user = await guard(OPERATORS);
  if (denied(user)) return user;
  const parsed = schema.safeParse(input);
  if (!parsed.success)
    return fail(
      "Check the customer, dates, payment terms, and quantities (1–999).",
    );
  const data = parsed.data;
  if (!data.planId && data.lines.length === 0)
    return fail("Choose a plan or add at least one product.");
  const keys = data.lines.map((l) => `${l.productId}:${l.variantId ?? ""}`);
  if (new Set(keys).size !== keys.length)
    return fail("Each product variant can appear only once.");
  const startDate = new Date(`${data.startDate}T00:00:00Z`);
  try {
    const subscription = await prisma.$transaction(async (tx) => {
      const customer = await tx.user.findFirst({
        where: { id: data.customerId, role: "CUSTOMER" },
        select: { id: true },
      });
      if (!customer) throw new UserFacing("Choose an existing customer.");
      const template = data.templateId
        ? await tx.quotationTemplate.findFirst({
            where: { id: data.templateId, active: true },
          })
        : null;
      if (data.templateId && !template)
        throw new UserFacing("That quotation template is no longer active.");
      const planId = data.planId ?? template?.planId;
      const plan = planId
        ? await tx.plan.findFirst({
            where: { id: planId, active: true },
            include: {
              product: {
                include: { taxRule: { select: { rate: true, active: true } } },
              },
            },
          })
        : null;
      if (planId && !plan) throw new UserFacing("That plan is not available.");
      if (plan) {
        if (plan.startDate > startDate || (plan.endDate && plan.endDate < startDate))
          throw new UserFacing(
            "The plan is not available on the chosen start date.",
          );
        if ((data.planQuantity ?? 1) < plan.minQuantity)
          throw new UserFacing(
            `This plan needs a quantity of at least ${plan.minQuantity}.`,
          );
      }
      const productIds = [...new Set(data.lines.map((l) => l.productId))];
      const products = await tx.product.findMany({
        where: { id: { in: productIds }, active: true },
        include: {
          taxRule: { select: { rate: true, active: true } },
          variants: { where: { active: true } },
        },
      });
      if (products.length !== productIds.length)
        throw new UserFacing("A product is no longer available.");
      const fallbackTax = await defaultTaxRate(tx);
      const lines: Prisma.SubscriptionLineCreateWithoutSubscriptionInput[] = [];
      if (plan) {
        let variantExtra = 0;
        if (data.planVariantId) {
          const variant = await tx.productVariant.findFirst({
            where: {
              id: data.planVariantId,
              productId: plan.productId,
              active: true,
            },
          });
          if (!variant) throw new UserFacing("Choose a valid plan variant.");
          variantExtra = variant.extraPrice;
        }
        lines.push({
          product: { connect: { id: plan.productId } },
          ...(data.planVariantId && {
            variant: { connect: { id: data.planVariantId } },
          }),
          quantity: data.planQuantity ?? 1,
          unitPrice: unitPriceFor(plan.product, {
            planPrice: plan.price,
            variantExtra,
          }),
          taxRate: taxRateFor(plan.product, fallbackTax),
        });
      }
      for (const line of data.lines) {
        const product = products.find((p) => p.id === line.productId)!;
        const variant = line.variantId
          ? product.variants.find((v) => v.id === line.variantId)
          : undefined;
        if (line.variantId && !variant)
          throw new UserFacing("Choose a valid product variant.");
        lines.push({
          product: { connect: { id: product.id } },
          ...(variant && { variant: { connect: { id: variant.id } } }),
          quantity: line.quantity,
          unitPrice: unitPriceFor(product, { variantExtra: variant?.extraPrice }),
          taxRate: taxRateFor(product, fallbackTax),
        });
      }
      const billingCycle = plan?.billingPeriod ?? data.billingCycle ?? "MONTHLY";
      const expiryDate = data.endDate
        ? new Date(`${data.endDate}T00:00:00Z`)
        : addPeriod(startDate, "YEARLY");
      if (expiryDate <= startDate)
        throw new UserFacing("The end date must be after the start date.");
      const validityDays = template?.validityDays ?? data.validityDays ?? 30;
      return tx.subscription.create({
        data: {
          user: { connect: { id: customer.id } },
          planNumber: await nextReference(tx),
          billingCycle,
          status: data.status,
          startDate,
          expiryDate,
          paymentTerms: data.paymentTerms,
          ...(plan && { plan: { connect: { id: plan.id } } }),
          ...(template && { template: { connect: { id: template.id } } }),
          validUntil:
            data.status === "QUOTATION"
              ? addDays(startOfUtcDay(new Date()), validityDays)
              : null,
          notes: data.notes || null,
          lines: { create: lines },
        },
      });
    });
    refresh("/subscriptions");
    return {
      success: true,
      message: `${subscription.planNumber} saved as ${data.status === "QUOTATION" ? "a quotation" : "a draft"}.`,
      id: subscription.id,
    };
  } catch (error) {
    if (error instanceof UserFacing) return fail(error.message);
    return fail("We couldn’t save this subscription. Please try again.");
  }
}
class UserFacing extends Error {}

const actionSchema = z.enum([
  "send_quotation",
  "confirm",
  "activate",
  "pause",
  "resume",
  "renew",
  "close",
]);
/** Moves a subscription along Draft → Quotation → Confirmed → Active (⇄ Paused) → Closed. */
export async function transitionSubscription(
  subscriptionId: string,
  action: LifecycleAction,
): Promise<ActionResult> {
  const user = await guard(OPERATORS);
  if (denied(user)) return user;
  if (!id.safeParse(subscriptionId).success || !actionSchema.safeParse(action).success)
    return fail("Unknown subscription action.");
  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: { plan: true },
  });
  if (!subscription) return fail("Subscription not found.");
  if (!allowedActions(subscription.status, subscription.plan).includes(action))
    return fail(
      `A ${subscription.status.toLowerCase()} subscription can’t be changed this way under its plan rules.`,
    );
  const now = new Date();
  if (
    action === "confirm" &&
    subscription.status === "QUOTATION" &&
    subscription.validUntil &&
    subscription.validUntil < startOfUtcDay(now)
  )
    return fail("This quotation has expired. Create a new one for the customer.");
  const data: Prisma.SubscriptionUpdateManyMutationInput = {
    status: nextStatus(subscription.status, action),
  };
  if (action === "activate") data.nextInvoiceDate = subscription.startDate;
  if (action === "resume" && subscription.nextInvoiceDate) {
    // Paused periods are not billed.
    const today = startOfUtcDay(now);
    if (subscription.nextInvoiceDate < today) data.nextInvoiceDate = today;
  }
  if (action === "renew") {
    data.expiryDate = addPeriod(subscription.expiryDate, "YEARLY");
    if (!subscription.nextInvoiceDate)
      data.nextInvoiceDate = subscription.expiryDate;
  }
  if (action === "close") {
    data.closedAt = now;
    data.nextInvoiceDate = null;
  }
  const updated = await prisma.subscription.updateMany({
    where: { id: subscriptionId, status: subscription.status },
    data,
  });
  if (!updated.count)
    return fail("This subscription changed in the meantime. Refresh and try again.");
  let invoices = 0;
  if (action === "activate" || action === "renew" || action === "resume")
    invoices = await billSubscription(subscriptionId, now);
  refresh("/subscriptions", `/subscriptions/${subscriptionId}`, "/invoices");
  return {
    success: true,
    message:
      `${subscription.planNumber}: ${action.replace("_", " ")} complete.` +
      (invoices ? ` ${invoices} draft invoice${invoices > 1 ? "s" : ""} created.` : ""),
  };
}
