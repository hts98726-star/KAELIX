// Define the shape of a variant based on the Prisma schema Ann is building
export type Variant = {
  id: string;
  name: string;
  priceAdjustment: number; // e.g., 560 for Odoo brand
};

/**
 * Calculates the final price of a product based on its base cost and selected variants.
 */
export function calculateTotalPricing(basePrice: number, selectedVariants: Variant[]): number {
  const variantsTotal = selectedVariants.reduce((sum, variant) => sum + variant.priceAdjustment, 0);
  return basePrice + variantsTotal;
}