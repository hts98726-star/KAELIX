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
};
export type CartItem = { productId: string; quantity: number };
