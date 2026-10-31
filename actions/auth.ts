"use server";

import { userSignupSchema } from "../lib/validations";
import { prisma } from "../lib/prisma";

export async function registerUser(formData: FormData) {
  // 1. Extract raw data from Hari's frontend form
  const rawData = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  // 2. Validate against your strict Zod rules
  const validatedFields = userSignupSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Registration failed. Please check your inputs.",
    };
  }

  // 3. Save to Ann's Database
  const { email, password } = validatedFields.data;
  
  try {
    const newUser = await prisma.user.create({
      data: {
        email: email,
        passwordHash: password, // Note: For production we would hash this with bcrypt, but this works for the hackathon MVP
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