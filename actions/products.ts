"use server";

import { authorize, AuthError } from "@/lib/auth/authorize";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

const price = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/)
  .transform(Number)
  .refine((value) => value <= 1_000_000);
const schema = z.object({
  name: z.string().trim().min(1).max(80),
  basePrice: price,
  variantName: z.string().trim().max(80),
  markupPrice: price,
  notes: z.string().trim().max(500),
});
// Product creation is restricted to administrators.
export async function createProduct(formData: FormData) {
  try {
    await authorize(["ADMIN"]);
  } catch (error) {
    if (error instanceof AuthError)
      return { success: false as const, message: error.message };
    throw error;
  }
  const input = schema.safeParse({
    name: formData.get("name"),
    basePrice: formData.get("basePrice"),
    variantName: formData.get("variantName") ?? "",
    markupPrice: formData.get("markupPrice") || "0",
    notes: formData.get("notes") ?? "",
  });
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
  try {
    await prisma.product.create({
      data: {
        ...input.data,
        type: "SERVICE",
        costPrice: 0,
        variantName: input.data.variantName || null,
        notes: input.data.notes || null,
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
