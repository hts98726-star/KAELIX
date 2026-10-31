import "server-only";
import { prisma } from "@/lib/prisma";
type AuthUser = {
  id: string;
  email: string;
  passwordHash: string;
  role: string;
};
// Preserve mixed-case legacy emails without rewriting account data. Parameters
// are bound by Prisma, and ambiguous legacy duplicates cannot authenticate.
export async function lookupUserByEmail(email: string) {
  const matches = await prisma.$queryRaw<
    AuthUser[]
  >`SELECT id, email, passwordHash, role FROM User WHERE lower(email) = ${email.toLowerCase()} LIMIT 2`;
  return {
    exists: matches.length > 0,
    user: matches.length === 1 ? matches[0] : null,
  };
}
