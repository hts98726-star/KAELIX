export type Role = "ADMIN" | "STAFF" | "CUSTOMER";
export type SessionUser = { id: string; email: string; role: Role };
export const OPERATORS: readonly Role[] = ["ADMIN", "STAFF"];
export function isRole(value: string): value is Role {
  return value === "ADMIN" || value === "STAFF" || value === "CUSTOMER";
}
export function roleHome(role: Role) {
  return role === "ADMIN" ? "/admin" : role === "STAFF" ? "/staff" : "/portal";
}
