import { Suspense } from "react";
import { requirePageUser } from "@/lib/auth/authorize";
import type { Role } from "@/lib/auth/roles";
import { Skeleton } from "@/components/ui/skeleton";
async function CheckRole({
  roles,
  children,
}: {
  roles: readonly Role[];
  children: React.ReactNode;
}) {
  await requirePageUser(roles);
  return children;
}
export function RoleGate({
  roles,
  children,
}: {
  roles: readonly Role[];
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<Skeleton className="h-80 w-full" />}>
      <CheckRole roles={roles}>{children}</CheckRole>
    </Suspense>
  );
}
