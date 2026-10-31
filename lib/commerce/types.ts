export type RegistrationResult = {
  success: boolean;
  message: string;
  errors?: {
    email?: string[];
    password?: string[];
    confirmPassword?: string[];
  };
};
export type CustomerOption = { id: string; email: string };
export type ProductOption = {
  id: string;
  name: string;
  type: string;
  basePrice: number;
  variantName: string | null;
  markupPrice: number;
  notes: string | null;
  taxRate: number;
};
export type CatalogProduct = ProductOption & {
  costPrice: number;
  active: boolean;
  taxRuleId: string | null;
  taxName: string | null;
  variantCount: number;
  planCount: number;
};
export type CartItem = { productId: string; quantity: number };
