import { PrismaClient } from "@prisma/client";

// This creates a single connection to Ann's database that the whole app can share
export const prisma = new PrismaClient();