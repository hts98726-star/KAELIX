import { Suspense } from "react";
import { requirePageUser } from "@/lib/auth/authorize";
import { AppShell } from "@/components/dashboard/app-shell";
async function AuthenticatedWorkspace({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requirePageUser();
  return <AppShell user={user}>{children}</AppShell>;
}
export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div
          role="status"
          className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground"
        >
          Opening your workspace…
        </div>
      }
    >
      <AuthenticatedWorkspace>{children}</AuthenticatedWorkspace>
    </Suspense>
  );
}
