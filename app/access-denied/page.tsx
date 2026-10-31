import { Suspense } from "react";
import Link from "next/link";
import { ShieldX } from "lucide-react";
import { requirePageUser } from "@/lib/auth/authorize";
import { roleHome } from "@/lib/auth/roles";
import { Button } from "@/components/ui/button";
async function Denied() {
  const user = await requirePageUser();
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="max-w-md rounded-2xl border bg-white p-10 text-center">
        <ShieldX className="mx-auto mb-5 size-9 text-primary" />
        <h1 className="text-2xl font-semibold">Access denied</h1>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          Your account doesn’t have permission to open this workspace.
        </p>
        <Button asChild className="mt-6">
          <Link href={roleHome(user.role)}>Return to your workspace</Link>
        </Button>
      </div>
    </main>
  );
}
export default function AccessDeniedPage() {
  return (
    <Suspense>
      <Denied />
    </Suspense>
  );
}
