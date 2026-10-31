import { Suspense } from "react";
import { RoleGate } from "@/components/auth/role-gate";
import { PortalRecords } from "@/components/auth/portal-records";
export default function Page() {
  return (
    <RoleGate roles={["CUSTOMER"]}>
      <div className="space-y-7">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            My subscriptions<span className="text-primary">.</span>
          </h1>
          <p className="mt-3 text-xs leading-6 text-muted-foreground">
            Your subscriptions and invoices, together in one place.
          </p>
        </div>
        <Suspense fallback={<p>Loading your records…</p>}>
          <PortalRecords kind="subscriptions" />
        </Suspense>
      </div>
    </RoleGate>
  );
}
