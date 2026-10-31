"use server";

import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { OPERATORS } from "@/lib/auth/roles";
import { nextInvoiceNumber, runBilling } from "@/lib/commerce/engine";
import {
  PAYMENT_METHODS,
  addDays,
  money,
  startOfUtcDay,
  termDays,
} from "@/lib/commerce/rules";
import { formatDate, formatMoney } from "@/lib/commerce/format";
import { EmailNotConfigured, sendEmail } from "@/lib/email";
import {
  denied,
  fail,
  guard,
  refresh,
  type ActionResult,
} from "@/lib/commerce/guard";

const id = z.string().uuid();
const paths = (invoiceId: string) => [
  "/invoices",
  `/invoices/${invoiceId}`,
  "/subscriptions",
];

export async function confirmInvoice(invoiceId: string): Promise<ActionResult> {
  const user = await guard(OPERATORS);
  if (denied(user)) return user;
  if (!id.safeParse(invoiceId).success) return fail("Invoice not found.");
  const now = new Date();
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const number = await prisma.$transaction(async (tx) => {
        const invoice = await tx.invoice.findUnique({
          where: { id: invoiceId },
          include: { subscription: { select: { paymentTerms: true } } },
        });
        if (!invoice) throw new UserFacing("Invoice not found.");
        if (invoice.status !== "DRAFT")
          throw new UserFacing("Only draft invoices can be confirmed.");
        const number = await nextInvoiceNumber(tx, now);
        const updated = await tx.invoice.updateMany({
          where: { id: invoiceId, status: "DRAFT" },
          data: {
            status: "CONFIRMED",
            number,
            confirmedAt: now,
            dueDate: addDays(
              startOfUtcDay(now),
              termDays(invoice.subscription.paymentTerms),
            ),
          },
        });
        if (!updated.count) throw new UserFacing("Only draft invoices can be confirmed.");
        return number;
      });
      refresh(...paths(invoiceId));
      return { success: true, message: `Invoice ${number} confirmed.` };
    } catch (error) {
      if (error instanceof UserFacing) return fail(error.message);
      // Two confirmations raced for the same number: take the next one.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
        continue;
      return fail("We couldn’t confirm this invoice. Please try again.");
    }
  }
  return fail("We couldn’t assign an invoice number. Please try again.");
}

export async function cancelInvoice(invoiceId: string): Promise<ActionResult> {
  const user = await guard(OPERATORS);
  if (denied(user)) return user;
  if (!id.safeParse(invoiceId).success) return fail("Invoice not found.");
  try {
    await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { id: invoiceId },
        include: { _count: { select: { payments: true } } },
      });
      if (!invoice) throw new UserFacing("Invoice not found.");
      if (!["DRAFT", "CONFIRMED"].includes(invoice.status))
        throw new UserFacing("Only draft or confirmed invoices can be cancelled.");
      if (invoice._count.payments)
        throw new UserFacing(
          "This invoice has recorded payments and can’t be cancelled.",
        );
      await tx.invoice.update({
        where: { id: invoiceId },
        data: { status: "CANCELLED" },
      });
      // Give back the discount use this invoice consumed.
      if (invoice.discountRuleId)
        await tx.discountRule.updateMany({
          where: { id: invoice.discountRuleId, usedCount: { gt: 0 } },
          data: { usedCount: { decrement: 1 } },
        });
    });
    refresh(...paths(invoiceId));
    return { success: true, message: "Invoice cancelled." };
  } catch (error) {
    if (error instanceof UserFacing) return fail(error.message);
    return fail("We couldn’t cancel this invoice. Please try again.");
  }
}

export async function sendInvoice(invoiceId: string): Promise<ActionResult> {
  const user = await guard(OPERATORS);
  if (denied(user)) return user;
  if (!id.safeParse(invoiceId).success) return fail("Invoice not found.");
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      subscription: {
        select: { planNumber: true, user: { select: { email: true } } },
      },
      payments: { select: { amount: true } },
    },
  });
  if (!invoice) return fail("Invoice not found.");
  if (!["CONFIRMED", "PAID"].includes(invoice.status))
    return fail("Confirm the invoice before sending it.");
  const paid = money(invoice.payments.reduce((s, p) => s + p.amount, 0));
  try {
    const delivery = await sendEmail({
      to: invoice.subscription.user.email,
      subject: `Invoice ${invoice.number} from Brightloop Software`,
      text: [
        `Invoice ${invoice.number} for subscription ${invoice.subscription.planNumber}.`,
        `Total: ${formatMoney(invoice.grandTotal)}. Paid: ${formatMoney(paid)}. Balance: ${formatMoney(money(invoice.grandTotal - paid))}.`,
        invoice.dueDate ? `Due: ${formatDate(invoice.dueDate)}.` : "",
        "Sign in to your customer portal to view and print it.",
      ]
        .filter(Boolean)
        .join("\n"),
    });
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { sentAt: new Date() },
    });
    refresh(...paths(invoiceId));
    return {
      success: true,
      message:
        delivery.transport === "console"
          ? "Invoice email written to the development server log (no real email was sent)."
          : `Invoice email handed to the ${delivery.transport} transport.`,
    };
  } catch (error) {
    if (error instanceof EmailNotConfigured)
      return fail("Email delivery isn’t configured for this environment.");
    return fail("We couldn’t send this invoice. Please try again.");
  }
}

const paymentSchema = z.object({
  invoiceId: id,
  method: z.enum(PAYMENT_METHODS),
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/)
    .transform(Number)
    .refine((value) => value > 0),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().trim().max(300),
});
/** Records a payment against a confirmed invoice; the invoice becomes Paid once fully settled. */
export async function recordPayment(formData: FormData): Promise<ActionResult> {
  const user = await guard(OPERATORS);
  if (denied(user)) return user;
  const parsed = paymentSchema.safeParse({
    invoiceId: formData.get("invoiceId"),
    method: formData.get("method"),
    amount: formData.get("amount"),
    date: formData.get("date"),
    note: formData.get("note") ?? "",
  });
  if (!parsed.success)
    return fail("Enter a positive amount with up to two decimals, a method, and a date.");
  const date = new Date(`${parsed.data.date}T12:00:00Z`);
  if (date > addDays(new Date(), 1))
    return fail("A payment date can’t be in the future.");
  try {
    const status = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { id: parsed.data.invoiceId },
        include: { payments: { select: { amount: true } } },
      });
      if (!invoice) throw new UserFacing("Invoice not found.");
      if (invoice.status !== "CONFIRMED")
        throw new UserFacing("Payments can only be recorded on confirmed, unpaid invoices.");
      const balance = money(
        invoice.grandTotal - invoice.payments.reduce((s, p) => s + p.amount, 0),
      );
      if (parsed.data.amount > balance)
        throw new UserFacing(
          `The amount exceeds the outstanding balance of ${formatMoney(balance)}.`,
        );
      await tx.payment.create({
        data: {
          invoiceId: invoice.id,
          method: parsed.data.method,
          amount: money(parsed.data.amount),
          date,
          note: parsed.data.note || null,
        },
      });
      const settled = money(balance - parsed.data.amount) <= 0;
      if (settled)
        await tx.invoice.update({
          where: { id: invoice.id },
          data: { status: "PAID" },
        });
      return settled ? "PAID" : "CONFIRMED";
    });
    refresh(...paths(parsed.data.invoiceId), "/payments");
    return {
      success: true,
      message:
        status === "PAID"
          ? "Payment recorded. The invoice is now paid."
          : "Partial payment recorded.",
    };
  } catch (error) {
    if (error instanceof UserFacing) return fail(error.message);
    return fail("We couldn’t record this payment. Please try again.");
  }
}

/** Billing day on demand: every due period becomes exactly one draft invoice. */
export async function runBillingNow(): Promise<ActionResult> {
  const user = await guard(OPERATORS);
  if (denied(user)) return user;
  try {
    const result = await runBilling();
    refresh("/invoices", "/subscriptions");
    return {
      success: true,
      message: `Billing run complete: ${result.invoices} draft invoice${result.invoices === 1 ? "" : "s"} created from ${result.subscriptions} due subscription${result.subscriptions === 1 ? "" : "s"}${result.closed ? `, ${result.closed} ended subscription${result.closed === 1 ? "" : "s"} closed` : ""}.`,
    };
  } catch {
    return fail("The billing run didn’t finish. Running it again is safe.");
  }
}
class UserFacing extends Error {}
