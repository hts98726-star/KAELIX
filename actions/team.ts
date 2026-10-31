"use server";

import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { lookupUserByEmail } from "@/lib/auth/users";
import { userSignupSchema } from "@/lib/validations";
import { denied, fail, guard, refresh, type ActionResult } from "@/lib/commerce/guard";

/** Only an administrator can add staff. The role is fixed to STAFF; existing accounts are never promoted. */
export async function createStaffMember(formData: FormData): Promise<ActionResult> {
  const user = await guard(["ADMIN"]);
  if (denied(user)) return user;
  const input = userSignupSchema
    .extend({ name: z.string().trim().max(80) })
    .safeParse({
      email: String(formData.get("email") ?? "").trim().toLowerCase(),
      password: formData.get("password"),
      name: formData.get("name") ?? "",
    });
  if (!input.success)
    return fail(
      "Use a valid email and a password longer than 8 characters with uppercase, lowercase, and special characters.",
    );
  if (new TextEncoder().encode(input.data.password).length > 72)
    return fail("Use a password of at most 72 UTF-8 bytes.");
  if ((await lookupUserByEmail(input.data.email)).exists)
    return fail("An account with this email already exists. It was not changed.");
  try {
    await prisma.user.create({
      data: {
        email: input.data.email,
        name: input.data.name || null,
        role: "STAFF",
        passwordHash: await bcrypt.hash(input.data.password, 10),
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
      return fail("An account with this email already exists. It was not changed.");
    return fail("We couldn’t create this staff account. Please try again.");
  }
  refresh("/settings");
  return { success: true, message: `Staff account ${input.data.email} created.` };
}
