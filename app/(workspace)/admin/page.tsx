import { Dashboard } from "@/components/dashboard/dashboard";
import { mockDashboardData } from "@/lib/dashboard/mock-data";
import { RoleGate } from "@/components/auth/role-gate";
export default function AdminPage() {
  return (
    <RoleGate roles={["ADMIN"]}>
      <Dashboard data={mockDashboardData} />
    </RoleGate>
  );
}
