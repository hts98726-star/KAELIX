import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

const WINDOW_MS = 15 * 60 * 1000;
export async function allowLoginAttempt(email: string) {
  const now = Date.now();
  const bucket = Math.floor(now / WINDOW_MS);
  const key = createHash("sha256")
    .update(`login:${email}:${bucket}`)
    .digest("hex");
  await prisma.authAttempt.deleteMany({
    where: { expiresAt: { lte: new Date(now) } },
  });
  const entry = await prisma.authAttempt.upsert({
    where: { key },
    create: { key, expiresAt: new Date((bucket + 1) * WINDOW_MS) },
    update: { attempts: { increment: 1 } },
  });
  return entry.attempts <= 10;
}

export async function clearLoginAttempts(email: string) {
  const bucket = Math.floor(Date.now() / WINDOW_MS);
  const key = createHash("sha256")
    .update(`login:${email}:${bucket}`)
    .digest("hex");
  await prisma.authAttempt.deleteMany({ where: { key } });
}
