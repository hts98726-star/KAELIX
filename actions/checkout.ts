"use server";

import { authorize, AuthError } from "@/lib/auth/authorize";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  createPeriodInvoice,
  defaultTaxRate,
  taxRateFor,
  unitPriceFor,
} from "@/lib/commerce/engine";
import { addPeriod } from "@/lib/commerce/rules";
import type { CartItem } from "@/lib/commerce/types";

const checkoutSchema = z.object({
  userId: z.string().uuid(),
  cartItems: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().min(1).max(999),
      }),
    )
    .min(1)
    .max(50),
});

// Operators may create subscriptions for customers; public customer accounts cannot invoke this operation.
export async function processCheckout(userId: string, cartItems: CartItem[]) {
  try {
    await authorize(["ADMIN", "STAFF"]);
  } catch (error) {
    if (error instanceof AuthError)
      return { success: false as const, message: error.message };
    throw error;
  }
  const parsed = checkoutSchema.safeParse({ userId, cartItems });
  if (!parsed.success)
    return {
      success: false as const,
      message:
        "Choose a customer and at least one product, with quantities from 1 to 999.",
    };
  const ids = parsed.data.cartItems.map((item) => item.productId);
  if (new Set(ids).size !== ids.length)
    return {
      success: false as const,
      message:
        "Each product can only appear once. Update its quantity instead.",
    };
  try {
    const data = await prisma.$transaction(async (tx) => {
      const customer = await tx.user.findFirst({
        where: { id: parsed.data.userId, role: "CUSTOMER" },
        select: { id: true },
      });
      if (!customer) throw new Error("Customer not found");
      const products = await tx.product.findMany({
        where: { id: { in: ids }, active: true },
        include: { taxRule: { select: { rate: true, active: true } } },
      });
      if (products.length !== ids.length)
        throw new Error("A product is no longer available");
      const fallbackTax = await defaultTaxRate(tx);
      const lines = parsed.data.cartItems.map((item) => {
        const product = products.find((entry) => entry.id === item.productId)!;
        const unitPrice = unitPriceFor(product);
        if (!Number.isFinite(unitPrice) || unitPrice < 0)
          throw new Error("Invalid product price");
        return {
          productId: product.id,
          quantity: item.quantity,
          unitPrice,
          taxRate: taxRateFor(product, fallbackTax),
        };
      });
      const startDate = new Date();
      const newSub = await tx.subscription.create({
        data: {
          userId: customer.id,
          planNumber: `PLAN-${randomUUID()}`,
          billingCycle: "MONTHLY",
          status: "ACTIVE",
          startDate,
          // A one-year contract, billed monthly; renewal extends it.
          expiryDate: addPeriod(startDate, "YEARLY"),
          nextInvoiceDate: addPeriod(startDate, "MONTHLY"),
          paymentTerms: "Due on Receipt",
          lines: { create: lines },
        },
      });
      const newInvoice = await createPeriodInvoice(
        tx,
        newSub.id,
        startDate,
        startDate,
      );
      return { newSub, newInvoice };
    });
    for (const path of [
      "/checkout",
      "/subscriptions",
      "/invoices",
      "/customers",
      "/admin",
    ])
      revalidatePath(path);
    return {
      success: true as const,
      message: "Subscription created and draft invoice saved.",
      data,
    };
  } catch {
    return {
      success: false as const,
      message:
        "Checkout couldn’t be completed. Refresh the page to check customer and product availability, then try again.",
    };
  }
}
