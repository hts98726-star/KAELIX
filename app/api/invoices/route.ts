import { authorize, authErrorResponse } from "@/lib/auth/authorize";
import { prisma } from "@/lib/prisma";
export async function GET() {
  try {
    const user = await authorize();
    const data = await prisma.invoice.findMany({
      where:
        user.role === "CUSTOMER" ? { subscription: { userId: user.id } } : {},
      orderBy: { issueDate: "desc" },
    });
    return Response.json(
      { data },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return authErrorResponse(error);
  }
}
