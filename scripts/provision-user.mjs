import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import nextEnv from "@next/env";
import { z } from "zod";
nextEnv.loadEnvConfig(process.cwd());
const args = process.argv.slice(2);
const argument = (name) => {
  const index = args.indexOf(name);
  return index < 0 ? undefined : args[index + 1];
};
const email = argument("--email")?.trim().toLowerCase();
const role = argument("--role");
const password = process.env.KAELIX_PROVISION_PASSWORD;
const validEmail = z.string().email().safeParse(email).success;
if (
  !validEmail ||
  !["ADMIN", "STAFF"].includes(role) ||
  !password ||
  password.length < 9 ||
  !/[A-Z]/.test(password) ||
  !/[a-z]/.test(password) ||
  !/[^a-zA-Z0-9]/.test(password) ||
  new TextEncoder().encode(password).length > 72
) {
  console.error(
    "Provide --email and --role ADMIN or STAFF, and set KAELIX_PROVISION_PASSWORD to a strong password longer than 8 characters. Passwords are never accepted as command-line arguments.",
  );
  process.exitCode = 1;
} else {
  const prisma = new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL ?? "file:./dev.db" } },
  });
  try {
    const existing =
      await prisma.$queryRaw`SELECT id FROM User WHERE lower(email) = ${email} LIMIT 1`;
    if (existing.length) throw new Error("Account already exists");
    await prisma.user.create({
      data: { email, role, passwordHash: await bcrypt.hash(password, 10) },
    });
    console.log(`Created ${role} account. No existing account was modified.`);
  } catch {
    console.error(
      "Provisioning failed. Check that the database is initialized and the email is not already registered.",
    );
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
    delete process.env.KAELIX_PROVISION_PASSWORD;
  }
}
