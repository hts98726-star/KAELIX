// Define the shape of a variant based on the Prisma schema Ann is building
export type Variant = {
  id: string;
  name: string;
  markupPrice: number; // Updated to match Ann's Product model
};

/**
 * Calculates the final price of a product based on its base cost and selected variants.
 */
export function calculateTotalPricing(basePrice: number, selectedVariants: Variant[]): number {
  const variantsTotal = selectedVariants.reduce((sum, variant) => sum + variant.markupPrice, 0);
  return basePrice + variantsTotal;
}