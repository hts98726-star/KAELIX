"use server";

import { prisma } from "../lib/prisma";
import { calculateTotalPricing, Variant } from "../lib/pricing";
import { generateInvoices, Subscription } from "../lib/billing";

// This is the payload Hari will send from the frontend checkout form
type CartItem = {
  productId: string;
  quantity: number;
  basePrice: number;
  variants: Variant[];
};

export async function processCheckout(userId: string, cartItems: CartItem[]) {
  try {
    // 1. Calculate the final price for each item using your pricing engine
    const lines = cartItems.map((item) => {
      const finalUnitPrice = calculateTotalPricing(item.basePrice, item.variants);
      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: finalUnitPrice,
      };
    });

    // 2. Format the data for your billing engine
    const draftSubscription: Subscription = {
      id: "temp-id", // Prisma will generate the real UUID during saving
      userId: userId,
      lines: lines,
    };

    // 3. Generate the invoice math using your billing logic
    const [generatedInvoice] = generateInvoices([draftSubscription]);

    // 4. Save to the database using a Prisma Transaction
    // A transaction ensures that if one table fails to save, they all cancel so you don't get corrupted data.
    const savedData = await prisma.$transaction(async (tx) => {
      
      // A. Create the Subscription AND its SubscriptionLines at the same time
      const newSub = await tx.subscription.create({
        data: {
          userId: userId,
          planNumber: `PLAN-${Date.now()}`,
          billingCycle: "Monthly",
          status: "Active",
          startDate: new Date(),
          expiryDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
          paymentTerms: "Due on Receipt",
          lines: {
            create: lines.map((line) => ({
              productId: line.productId,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
            })),
          },
        },
      });

      // B. Create the Invoice attached to the new subscription
      const newInvoice = await tx.invoice.create({
        data: {
          subscriptionId: newSub.id,
          subTotal: generatedInvoice.subTotal,
          taxAmount: generatedInvoice.taxTotal,
          discountAmount: generatedInvoice.discountApplied,
          grandTotal: generatedInvoice.grandTotal,
          status: generatedInvoice.status,
        },
      });

      return { newSub, newInvoice };
    });

    return { success: true, message: "Checkout complete & Invoice generated!", data: savedData };
    
  } catch (error) {
    console.error("Checkout failed:", error);
    return { success: false, message: "Failed to process billing." };
  }
}