import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { getIronSession, type SessionOptions } from "iron-session";
import { prisma } from "@/lib/prisma";
import { isRole, type SessionUser } from "./roles";

const COOKIE_NAME = "kaelix_session";
const SESSION_SECONDS = 8 * 60 * 60;
type CookieSession = { token: string };
const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");
function options(): SessionOptions {
  const password = process.env.SESSION_SECRET;
  if (!password || password.length < 32)
    throw new Error(
      "Configure SESSION_SECRET with npm run auth:setup before signing in.",
    );
  return {
    password,
    cookieName: COOKIE_NAME,
    ttl: SESSION_SECONDS,
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_SECONDS,
    },
  };
}
async function cookieSession() {
  return getIronSession<CookieSession>(await cookies(), options());
}
function isToken(token: unknown): token is string {
  return typeof token === "string" && /^[A-Za-z0-9_-]{43}$/.test(token);
}

// React cache is request-scoped, never a shared cross-user data cache.
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  await connection();
  if (!(await cookies()).has(COOKIE_NAME)) return null;
  const session = await cookieSession();
  if (!isToken(session.token)) return null;
  const stored = await prisma.authSession.findUnique({
    where: { tokenHash: hashToken(session.token) },
    select: {
      expiresAt: true,
      user: { select: { id: true, email: true, role: true } },
    },
  });
  if (!stored || stored.expiresAt <= new Date() || !isRole(stored.user.role))
    return null;
  return {
    id: stored.user.id,
    email: stored.user.email,
    role: stored.user.role,
  };
});

export async function createSession(userId: string) {
  const session = await cookieSession();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000);
  // Rotate any previous session on login; only the digest is stored in SQLite.
  await prisma.$transaction(async (tx) => {
    if (isToken(session.token))
      await tx.authSession.deleteMany({
        where: { tokenHash: hashToken(session.token) },
      });
    await tx.authSession.deleteMany({
      where: { expiresAt: { lte: new Date() } },
    });
    await tx.authSession.create({
      data: { userId, tokenHash: hashToken(token), expiresAt },
    });
  });
  session.token = token;
  try {
    await session.save();
  } catch (error) {
    await prisma.authSession.deleteMany({
      where: { tokenHash: hashToken(token) },
    });
    throw error;
  }
}

export async function destroySession() {
  const session = await cookieSession();
  // If revocation fails, do not report a successful logout with a replayable token.
  if (isToken(session.token))
    await prisma.authSession.deleteMany({
      where: { tokenHash: hashToken(session.token) },
    });
  session.destroy();
}
