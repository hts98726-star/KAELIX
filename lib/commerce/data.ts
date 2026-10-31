import "server-only";
import { authorize } from "@/lib/auth/authorize";
import { OPERATORS } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";

export async function getCustomers() {
  await authorize(OPERATORS);
  return prisma.user.findMany({
    where: { role: "CUSTOMER" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      createdAt: true,
      _count: { select: { subscriptions: true } },
    },
  });
}
export async function getProducts() {
  await authorize(OPERATORS);
  return prisma.product.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      type: true,
      basePrice: true,
      variantName: true,
      markupPrice: true,
      notes: true,
    },
  });
}
export async function getSubscriptions() {
  await authorize(OPERATORS);
  return prisma.subscription.findMany({
    orderBy: { startDate: "desc" },
    include: {
      user: { select: { email: true } },
      lines: { include: { product: { select: { name: true } } } },
    },
  });
}
export async function getInvoices() {
  await authorize(OPERATORS);
  return prisma.invoice.findMany({
    orderBy: { issueDate: "desc" },
    include: {
      subscription: {
        select: { planNumber: true, user: { select: { email: true } } },
      },
    },
  });
}

export async function getOwnSubscriptions() {
  const user = await authorize(["CUSTOMER"]);
  return prisma.subscription.findMany({
    where: { userId: user.id },
    orderBy: { startDate: "desc" },
    include: { lines: { include: { product: { select: { name: true } } } } },
  });
}
export async function getOwnInvoices() {
  const user = await authorize(["CUSTOMER"]);
  return prisma.invoice.findMany({
    where: { subscription: { userId: user.id } },
    orderBy: { issueDate: "desc" },
    include: { subscription: { select: { planNumber: true } } },
  });
}
