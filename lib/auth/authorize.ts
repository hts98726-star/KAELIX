import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser } from "./session";
import type { Role, SessionUser } from "./roles";

export class AuthError extends Error {
  constructor(public readonly status: 401 | 403) {
    super(
      status === 401
        ? "Sign in to continue."
        : "You do not have permission to perform this action.",
    );
  }
}
export async function authorize(roles?: readonly Role[]): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError(401);
  if (roles && !roles.includes(user.role)) throw new AuthError(403);
  return user;
}
export async function requirePageUser(roles?: readonly Role[]) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (roles && !roles.includes(user.role)) redirect("/access-denied");
  return user;
}
export function authErrorResponse(error: unknown) {
  if (error instanceof AuthError)
    return Response.json(
      { error: error.message },
      {
        status: error.status,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  throw error;
}
