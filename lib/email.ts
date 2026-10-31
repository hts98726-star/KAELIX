import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

export class EmailNotConfigured extends Error {}
type Message = { to: string; subject: string; text: string };

/**
 * No real email provider is configured yet. Transports:
 * - "console": development default; writes the message to the server log only.
 * - "file": writes JSON files to EMAIL_OUTBOX_DIR (used by the isolated test suite).
 * Production without EMAIL_TRANSPORT refuses to pretend a message was delivered.
 */
export async function sendEmail(message: Message) {
  const transport =
    process.env.EMAIL_TRANSPORT ??
    (process.env.NODE_ENV === "production" ? "none" : "console");
  if (transport === "file") {
    const dir = process.env.EMAIL_OUTBOX_DIR;
    if (!dir) throw new EmailNotConfigured();
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, `${Date.now()}-${randomUUID()}.json`),
      JSON.stringify({ ...message, createdAt: new Date().toISOString() }),
    );
    return { transport } as const;
  }
  if (transport === "console") {
    console.info(
      `[email:console] Not delivered — development transport.\nTo: ${message.to}\nSubject: ${message.subject}\n\n${message.text}\n`,
    );
    return { transport } as const;
  }
  throw new EmailNotConfigured();
}
