import { Suspense } from "react";
import { connection } from "next/server";
import { Dashboard } from "@/components/dashboard/dashboard";
import { RoleGate } from "@/components/auth/role-gate";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkspaceUnavailable } from "@/components/commerce/workspace-states";
import { getDashboardData } from "@/lib/dashboard/data";

async function DashboardData() {
  await connection();
  let data;
  try {
    data = await getDashboardData();
  } catch {
    return <WorkspaceUnavailable />;
  }
  return <Dashboard data={data} />;
}
export default function AdminPage() {
  return (
    <RoleGate roles={["ADMIN"]}>
      <Suspense fallback={<Skeleton className="h-[640px] w-full" />}>
        <DashboardData />
      </Suspense>
    </RoleGate>
  );
}
