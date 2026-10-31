"use server";

import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { lookupUserByEmail } from "@/lib/auth/users";
import { allowResetRequest } from "@/lib/auth/throttle";
import { userSignupSchema } from "@/lib/validations";
import { EmailNotConfigured, sendEmail } from "@/lib/email";

const TOKEN_MINUTES = 30;
const hash = (token: string) => createHash("sha256").update(token).digest("hex");
export type ResetState = { message: string; success?: boolean };

// Links must point at a trusted origin. Production requires APP_URL; development may use the request host.
async function appOrigin() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.NODE_ENV === "production") throw new EmailNotConfigured();
  const host = (await headers()).get("host");
  return `http://${host ?? "localhost:3000"}`;
}

const GENERIC =
  "If an account exists for that email, a reset link is on its way. It expires in 30 minutes.";
/** Always answers the same way so the form can’t be used to discover accounts. */
export async function requestPasswordReset(
  _previous: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const email = z
    .string()
    .trim()
    .toLowerCase()
    .email()
    .max(254)
    .safeParse(formData.get("email"));
  if (!email.success) return { message: "Enter a valid email address." };
  try {
    if (!(await allowResetRequest(email.data)))
      return { message: "Too many reset requests. Please try again in 15 minutes." };
    const { user } = await lookupUserByEmail(email.data);
    if (user) {
      const token = randomBytes(32).toString("base64url");
      const origin = await appOrigin();
      await prisma.$transaction([
        prisma.passwordResetToken.deleteMany({
          where: { userId: user.id, usedAt: null },
        }),
        prisma.passwordResetToken.create({
          data: {
            userId: user.id,
            tokenHash: hash(token),
            expiresAt: new Date(Date.now() + TOKEN_MINUTES * 60_000),
          },
        }),
      ]);
      await sendEmail({
        to: user.email,
        subject: "Reset your KAELIX PULSE password",
        text: `Use this single-use link within ${TOKEN_MINUTES} minutes to choose a new password:\n${origin}/reset-password?token=${token}\n\nIf you didn’t ask for this, you can ignore this email.`,
      });
    }
  } catch (error) {
    if (error instanceof EmailNotConfigured)
      return { message: "Password reset email isn’t configured for this environment yet." };
    return { message: "We couldn’t start a reset right now. Please try again." };
  }
  return { message: GENERIC, success: true };
}

/** Consumes a single-use token, sets the new password, and signs the account out everywhere. */
export async function resetPassword(
  _previous: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const token = String(formData.get("token") ?? "");
  const password = formData.get("password");
  if (password !== formData.get("confirmPassword"))
    return { message: "Your passwords don’t match." };
  const valid = userSignupSchema.shape.password.safeParse(password);
  if (!valid.success)
    return {
      message:
        "Use more than 8 characters with an uppercase letter, a lowercase letter, and a special character.",
    };
  if (new TextEncoder().encode(valid.data).length > 72)
    return { message: "Use a password of at most 72 UTF-8 bytes." };
  if (!/^[A-Za-z0-9_-]{43}$/.test(token))
    return { message: "This reset link is invalid or has expired." };
  try {
    const passwordHash = await bcrypt.hash(valid.data, 10);
    const done = await prisma.$transaction(async (tx) => {
      const stored = await tx.passwordResetToken.findUnique({
        where: { tokenHash: hash(token) },
      });
      if (!stored || stored.usedAt || stored.expiresAt <= new Date()) return false;
      const claimed = await tx.passwordResetToken.updateMany({
        where: { id: stored.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      if (!claimed.count) return false;
      await tx.user.update({
        where: { id: stored.userId },
        data: { passwordHash },
      });
      await tx.authSession.deleteMany({ where: { userId: stored.userId } });
      await tx.passwordResetToken.deleteMany({
        where: { userId: stored.userId, usedAt: null },
      });
      return true;
    });
    if (!done) return { message: "This reset link is invalid or has expired." };
  } catch {
    return { message: "We couldn’t reset your password. Please try again." };
  }
  redirect("/login?reset=1");
}
