import { authorize, authErrorResponse } from "@/lib/auth/authorize";
import { prisma } from "@/lib/prisma";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await authorize();
    const { id } = await params;
    const data = await prisma.invoice.findFirst({
      where: {
        id,
        ...(user.role === "CUSTOMER"
          ? { subscription: { userId: user.id }, status: { not: "DRAFT" } }
          : {}),
      },
    });
    return Response.json(data ? { data } : { error: "Invoice not found." }, {
      status: data ? 200 : 404,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
