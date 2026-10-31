import "server-only";
import { revalidatePath } from "next/cache";
import { authorize, AuthError } from "@/lib/auth/authorize";
import type { Role, SessionUser } from "@/lib/auth/roles";

export type ActionResult = { success: boolean; message: string; id?: string };

/** Every mutation authorizes on the server; hidden buttons are presentation only. */
export async function guard(
  roles: readonly Role[],
): Promise<SessionUser | ActionResult> {
  try {
    return await authorize(roles);
  } catch (error) {
    if (error instanceof AuthError)
      return { success: false, message: error.message };
    throw error;
  }
}
export function denied(value: SessionUser | ActionResult): value is ActionResult {
  return "success" in value;
}
export const fail = (message: string): ActionResult => ({
  success: false,
  message,
});
export function refresh(...paths: string[]) {
  for (const path of new Set([...paths, "/admin", "/reports"]))
    revalidatePath(path);
}
