import type { Metadata } from "next";
import { Blocks, Building2, Cable, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Settings" };
export default function SettingsPage() {
  return (
    <div className="page-enter max-w-4xl space-y-6">
      <div>
        <Badge className="mb-3">Demo workspace</Badge>
        <h1 className="text-3xl font-semibold tracking-tight">
          Make yourself at home<span className="text-primary">.</span>
        </h1>
        <p className="mt-2 text-xs text-muted-foreground">
          Your workspace details and integration overview.
        </p>
      </div>
      <Card className="p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Building2 className="size-4 text-primary" />
          Workspace profile
        </h2>
        <dl className="mt-6 grid gap-6 text-xs sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Workspace name</dt>
            <dd className="mt-2 font-medium">Kaelix workspace</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Brand</dt>
            <dd className="mt-2 font-medium">KAELIX PULSE</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Environment</dt>
            <dd className="mt-2">
              <Badge>Frontend prototype</Badge>
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Display currency</dt>
            <dd className="mt-2 font-medium">USD · US Dollar</dd>
          </div>
        </dl>
      </Card>
      <Card className="p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Cable className="size-4 text-primary" />
          Integration overview
        </h2>
        <p className="mt-2 text-xs leading-6 text-muted-foreground">
          UI previews are ready. Your team will connect the services below.
        </p>
        <div className="mt-5 divide-y">
          {[
            {
              label: "Odoo & billing",
              description: "Invoices, payments, and billing engine",
              icon: Blocks,
            },
            {
              label: "Authentication",
              description: "Identity, sessions, and access",
              icon: ShieldCheck,
            },
            {
              label: "Backend API",
              description: "Subscriptions, customers, and analytics",
              icon: Cable,
            },
          ].map(({ label, description, icon: Icon }) => (
            <div key={label} className="flex flex-wrap items-center gap-3 py-4">
              <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Icon className="size-4" />
              </span>
              <div className="flex-1">
                <h3 className="text-xs font-medium">{label}</h3>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {description}
                </p>
              </div>
              <Badge variant="secondary">Not connected</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
