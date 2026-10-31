import { prisma } from "@/lib/prisma";

export function getCustomers() {
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
export function getProducts() {
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
export function getSubscriptions() {
  return prisma.subscription.findMany({
    orderBy: { startDate: "desc" },
    include: {
      user: { select: { email: true } },
      lines: { include: { product: { select: { name: true } } } },
    },
  });
}
export function getInvoices() {
  return prisma.invoice.findMany({
    orderBy: { issueDate: "desc" },
    include: {
      subscription: {
        select: { planNumber: true, user: { select: { email: true } } },
      },
    },
  });
}
