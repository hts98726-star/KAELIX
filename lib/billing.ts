export type Discount = {
  type: "fixed" | "percent";
  amount: number;
};

export type SubscriptionLine = {
  productId: string;
  quantity: number;
  unitPrice: number;
};

export type Subscription = {
  id: string;
  userId: string; // Updated from customerId to match Ann's User model
  lines: SubscriptionLine[];
  discount?: Discount;
};

export type Invoice = {
  subscriptionId: string;
  userId: string; // Updated from customerId to match Ann's User model
  subTotal: number;
  discountApplied: number;
  taxTotal: number;
  grandTotal: number;
  status: "Draft";
};

/**
 * Core billing engine: Converts active subscriptions into Draft invoices.
 * Applies percentage or fixed discounts and calculates a standard 10% tax rate.
 */
export function generateInvoices(subscriptions: Subscription[], taxRate: number = 0.10): Invoice[] {
  return subscriptions.map((sub) => {
    // 1. Calculate base subtotal from product lines
    const subTotal = sub.lines.reduce((sum, line) => sum + (line.unitPrice * line.quantity), 0);

    // 2. Apply Discounts (Admin rule)
    let discountApplied = 0;
    if (sub.discount) {
      if (sub.discount.type === "fixed") {
        discountApplied = sub.discount.amount;
      } else if (sub.discount.type === "percent") {
        discountApplied = subTotal * (sub.discount.amount / 100);
      }
    }

    const discountedTotal = Math.max(0, subTotal - discountApplied);

    // 3. Calculate Taxes (Admin rule)
    const taxTotal = discountedTotal * taxRate;

    // 4. Generate the final Grand Total
    const grandTotal = discountedTotal + taxTotal;

    return {
      subscriptionId: sub.id,
      userId: sub.userId, // Updated from customerId
      subTotal,
      discountApplied,
      taxTotal,
      grandTotal,
      status: "Draft", // Always starts as Draft per Brightloop rules
    };
  });
}