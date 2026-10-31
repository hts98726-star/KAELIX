import { authorize, authErrorResponse } from "@/lib/auth/authorize";
import { prisma } from "@/lib/prisma";
export async function GET() {
  try {
    const user = await authorize();
    const data = await prisma.subscription.findMany({
      where: user.role === "CUSTOMER" ? { userId: user.id } : {},
      orderBy: { startDate: "desc" },
      include: { lines: { include: { product: { select: { name: true } } } } },
    });
    return Response.json(
      { data },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return authErrorResponse(error);
  }
}
