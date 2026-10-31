"use server";

import { userSignupSchema } from "../lib/validations";
import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs";

export async function registerUser(formData: FormData) {
  // 1. Extract raw data from frontend form
  const rawData = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  // 2. Validate against Zod rules
  const validatedFields = userSignupSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Registration failed. Please check your inputs.",
    };
  }

  const { email, password } = validatedFields.data;
  
  try {
    // 3. Hash the password before saving (Faheem's requirement)
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Save to Database
    const newUser = await prisma.user.create({
      data: {
        email: email,
        passwordHash: hashedPassword,
        role: "CUSTOMER",
      }
    });
    
    return { 
      message: "Account secured and saved to the database!",
      success: true 
    };
  } catch (error) {
    return { 
      message: "Database error. This email might already exist.",
      success: false 
    };
  }
}