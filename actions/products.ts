"use server";

import { authorize, AuthError } from "@/lib/auth/authorize";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { PRODUCT_TYPES } from "@/lib/commerce/rules";
import { denied, fail, guard, type ActionResult } from "@/lib/commerce/guard";

const price = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/)
  .transform(Number)
  .refine((value) => value <= 1_000_000);
const schema = z.object({
  name: z.string().trim().min(1).max(80),
  type: z.enum(PRODUCT_TYPES),
  basePrice: price,
  costPrice: price,
  variantName: z.string().trim().max(80),
  markupPrice: price,
  notes: z.string().trim().max(500),
  taxRuleId: z.union([z.literal(""), z.string().uuid()]),
});
function read(formData: FormData) {
  return schema.safeParse({
    name: formData.get("name"),
    type: formData.get("type") || "SERVICE",
    basePrice: formData.get("basePrice"),
    costPrice: formData.get("costPrice") || "0",
    variantName: formData.get("variantName") ?? "",
    markupPrice: formData.get("markupPrice") || "0",
    notes: formData.get("notes") ?? "",
    taxRuleId: formData.get("taxRuleId") ?? "",
  });
}
async function validTaxRule(taxRuleId: string) {
  return (
    !taxRuleId ||
    !!(await prisma.taxRule.findFirst({ where: { id: taxRuleId, active: true } }))
  );
}
// Product creation is restricted to administrators.
export async function createProduct(formData: FormData) {
  try {
    await authorize(["ADMIN"]);
  } catch (error) {
    if (error instanceof AuthError)
      return { success: false as const, message: error.message };
    throw error;
  }
  const input = read(formData);
  if (!input.success)
    return {
      success: false,
      message:
        "Enter a product name and non-negative prices with up to two decimal places (maximum $1,000,000).",
    };
  if (!input.data.variantName && input.data.markupPrice !== 0)
    return {
      success: false,
      message: "Add a variant name before setting its markup.",
    };
  if (!(await validTaxRule(input.data.taxRuleId)))
    return { success: false, message: "Choose an active tax rule." };
  try {
    await prisma.product.create({
      data: {
        ...input.data,
        variantName: input.data.variantName || null,
        notes: input.data.notes || null,
        taxRuleId: input.data.taxRuleId || null,
      },
    });
    revalidatePath("/products");
    revalidatePath("/checkout");
    return { success: true, message: "Product added to your catalog." };
  } catch {
    return {
      success: false,
      message: "We couldn’t save this product. Please try again.",
    };
  }
}

// Editing changes future subscriptions only: existing lines keep their saved unit price and tax rate.
export async function updateProduct(formData: FormData): Promise<ActionResult> {
  const user = await guard(["ADMIN"]);
  if (denied(user)) return user;
  const productId = z.string().uuid().safeParse(formData.get("id"));
  const input = read(formData);
  if (!productId.success || !input.success)
    return fail(
      "Enter a product name and non-negative prices with up to two decimal places.",
    );
  if (!input.data.variantName && input.data.markupPrice !== 0)
    return fail("Add a variant name before setting its markup.");
  if (!(await validTaxRule(input.data.taxRuleId)))
    return fail("Choose an active tax rule.");
  const updated = await prisma.product.updateMany({
    where: { id: productId.data },
    data: {
      ...input.data,
      variantName: input.data.variantName || null,
      notes: input.data.notes || null,
      taxRuleId: input.data.taxRuleId || null,
    },
  });
  if (!updated.count) return fail("Product not found.");
  revalidatePath("/products");
  revalidatePath(`/products/${productId.data}`);
  return { success: true, message: "Product updated. Existing subscriptions keep their prices." };
}

/** Archived products leave checkout and new subscriptions; history stays intact. */
export async function setProductActive(
  productId: string,
  active: boolean,
): Promise<ActionResult> {
  const user = await guard(["ADMIN"]);
  if (denied(user)) return user;
  if (!z.string().uuid().safeParse(productId).success)
    return fail("Product not found.");
  const updated = await prisma.product.updateMany({
    where: { id: productId },
    data: { active: active === true },
  });
  if (!updated.count) return fail("Product not found.");
  revalidatePath("/products");
  revalidatePath(`/products/${productId}`);
  revalidatePath("/checkout");
  return {
    success: true,
    message: active ? "Product restored to the catalog." : "Product archived.",
  };
}

const variantSchema = z.object({
  productId: z.string().uuid(),
  attribute: z.string().trim().min(1).max(40),
  value: z.string().trim().min(1).max(60),
  extraPrice: price,
});
export async function addVariant(formData: FormData): Promise<ActionResult> {
  const user = await guard(["ADMIN"]);
  if (denied(user)) return user;
  const input = variantSchema.safeParse({
    productId: formData.get("productId"),
    attribute: formData.get("attribute"),
    value: formData.get("value"),
    extraPrice: formData.get("extraPrice") || "0",
  });
  if (!input.success)
    return fail("Enter an attribute, a value, and a non-negative extra price.");
  if (!(await prisma.product.findUnique({ where: { id: input.data.productId } })))
    return fail("Product not found.");
  await prisma.productVariant.create({ data: input.data });
  revalidatePath(`/products/${input.data.productId}`);
  revalidatePath("/products");
  return {
    success: true,
    message: `Variant ${input.data.attribute}: ${input.data.value} added.`,
  };
}
export async function setVariantActive(
  variantId: string,
  active: boolean,
): Promise<ActionResult> {
  const user = await guard(["ADMIN"]);
  if (denied(user)) return user;
  if (!z.string().uuid().safeParse(variantId).success)
    return fail("Variant not found.");
  const variant = await prisma.productVariant.update({
    where: { id: variantId },
    data: { active: active === true },
  });
  revalidatePath(`/products/${variant.productId}`);
  return {
    success: true,
    message: active ? "Variant restored." : "Variant archived.",
  };
}
