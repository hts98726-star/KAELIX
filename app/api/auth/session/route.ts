import { authorize, authErrorResponse } from "@/lib/auth/authorize";
export async function GET() {
  try {
    return Response.json(
      { user: await authorize() },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return authErrorResponse(error);
  }
}
