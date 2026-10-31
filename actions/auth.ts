"use server";

import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { lookupUserByEmail } from "@/lib/auth/users";
import { userSignupSchema } from "@/lib/validations";
import type { RegistrationResult } from "@/lib/commerce/types";

export async function registerUser(
  formData: FormData,
): Promise<RegistrationResult> {
  const validated = userSignupSchema.safeParse({
    email:
      typeof formData.get("email") === "string"
        ? String(formData.get("email")).trim().toLowerCase()
        : "",
    password: formData.get("password"),
  });
  if (!validated.success) {
    return {
      success: false,
      message: "Please check the highlighted fields.",
      errors: validated.error.flatten().fieldErrors,
    };
  }
  if (new TextEncoder().encode(validated.data.password).length > 72) {
    return {
      success: false,
      message: "Please check your password.",
      errors: { password: ["Use a password of at most 72 UTF-8 bytes."] },
    };
  }
  try {
    if ((await lookupUserByEmail(validated.data.email)).exists)
      return {
        success: false,
        message: "An account with this email already exists.",
        errors: { email: ["This email is already registered."] },
      };
    await prisma.user.create({
      data: {
        email: validated.data.email,
        passwordHash: await bcrypt.hash(validated.data.password, 10),
        role: "CUSTOMER",
      },
    });
    revalidatePath("/customers");
    revalidatePath("/checkout");
    return { success: true, message: "Your account has been created." };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        success: false,
        message: "An account with this email already exists.",
        errors: { email: ["This email is already registered."] },
      };
    }
    return {
      success: false,
      message: "We couldn’t create your account. Please try again.",
    };
  }
}
