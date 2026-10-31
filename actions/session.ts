"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { lookupUserByEmail } from "@/lib/auth/users";
import { createSession, destroySession } from "@/lib/auth/session";
import { isRole, roleHome } from "@/lib/auth/roles";
import { allowLoginAttempt, clearLoginAttempts } from "@/lib/auth/throttle";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(72),
});
let dummyHash: Promise<string> | undefined;
export type LoginState = { message: string };
export async function loginUser(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (
    !parsed.success ||
    new TextEncoder().encode(parsed.data.password).length > 72
  )
    return { message: "Email or password is incorrect." };
  let destination: string;
  try {
    if (!(await allowLoginAttempt(parsed.data.email)))
      return {
        message: "Too many sign-in attempts. Please try again in 15 minutes.",
      };
    const { user } = await lookupUserByEmail(parsed.data.email);
    const valid = await bcrypt.compare(
      parsed.data.password,
      user?.passwordHash ??
        (await (dummyHash ??= bcrypt.hash("not-a-real-account-password", 10))),
    );
    if (!user || !valid || !isRole(user.role))
      return { message: "Email or password is incorrect." };
    await clearLoginAttempts(parsed.data.email);
    await createSession(user.id);
    destination = roleHome(user.role);
  } catch {
    return { message: "Sign-in is temporarily unavailable. Please try again." };
  }
  revalidatePath("/", "layout");
  redirect(destination);
}
export async function logoutUser() {
  await destroySession();
  revalidatePath("/", "layout");
  redirect("/login");
}
