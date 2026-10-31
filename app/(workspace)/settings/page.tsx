import { RoleGate } from "@/components/auth/role-gate";
import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { Blocks, Building2, Cable, ShieldCheck, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ActionForm, Field } from "@/components/commerce/action-controls";
import { WorkspaceUnavailable } from "@/components/commerce/workspace-states";
import { createStaffMember } from "@/actions/team";
import { getTeam } from "@/lib/commerce/data";
import { formatDate } from "@/lib/commerce/format";

export const metadata: Metadata = { title: "Settings" };

async function Team() {
  await connection();
  let team;
  try {
    team = await getTeam();
  } catch {
    return <WorkspaceUnavailable />;
  }
  return (
    <Card className="p-6">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <Users className="size-4 text-primary" />
        Team
      </h2>
      <p className="mt-2 text-xs leading-6 text-muted-foreground">
        Only administrators can add staff. Staff handle customers,
        subscriptions, invoices, and payments, but can’t change products,
        pricing rules, or settings.
      </p>
      <div className="mt-5 grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_280px]">
        <ul className="divide-y rounded-lg border" aria-label="Team members">
          {team.map((member) => (
            <li
              key={member.id}
              className="flex flex-wrap items-center justify-between gap-2 p-3 text-xs"
            >
              <span className="min-w-0 break-all">
                <span className="block font-medium">
                  {member.name ?? member.email}
                </span>
                {member.name && (
                  <span className="text-muted-foreground">{member.email}</span>
                )}
              </span>
              <span className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <Badge variant={member.role === "ADMIN" ? "default" : "secondary"}>
                  {member.role === "ADMIN" ? "Administrator" : "Staff"}
                </Badge>
                since {formatDate(member.createdAt)}
              </span>
            </li>
          ))}
        </ul>
        <ActionForm
          action={createStaffMember}
          submitLabel="Add staff member"
          ariaLabel="Add staff member"
        >
          <Field label="Full name" htmlFor="staff-name">
            <Input id="staff-name" name="name" maxLength={80} />
          </Field>
          <Field label="Work email" htmlFor="staff-email">
            <Input
              id="staff-email"
              name="email"
              type="email"
              required
              maxLength={254}
            />
          </Field>
          <Field
            label="Temporary password"
            htmlFor="staff-password"
            hint="More than 8 characters with uppercase, lowercase, and a special character. Share it privately; they can reset it later."
          >
            <Input
              id="staff-password"
              name="password"
              type="password"
              required
              minLength={9}
              maxLength={72}
              autoComplete="new-password"
            />
          </Field>
        </ActionForm>
      </div>
    </Card>
  );
}
function SettingsPageContent() {
  return (
    <div className="page-enter max-w-4xl space-y-6">
      <div>
        <Badge className="mb-3">Development workspace</Badge>
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
              <Badge>Connected workspace</Badge>
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
          Subscriptions, recurring billing, invoices, and manually recorded
          payments are connected. Online payment collection, real email
          delivery, and Odoo sync are not configured yet.
        </p>
        <div className="mt-5 divide-y">
          {[
            {
              label: "Subscription billing",
              description: "Checkout, subscription records, and draft invoices",
              status: "Connected",
              icon: Blocks,
            },
            {
              label: "Session authentication",
              description: "Login and workspace access control",
              status: "Connected",
              icon: ShieldCheck,
            },
            {
              label: "Customer registration",
              description: "Validated accounts with hashed passwords",
              status: "Connected",
              icon: Cable,
            },
            {
              label: "Email delivery",
              description:
                "Development transport only: messages go to the server log",
              status: "Not configured",
              icon: Cable,
            },
            {
              label: "Online payments and Odoo sync",
              description: "Needs a provider, credentials, and webhooks",
              status: "Not configured",
              icon: Cable,
            },
          ].map(({ label, description, status, icon: Icon }) => (
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
              <Badge variant={status === "Connected" ? "success" : "secondary"}>
                {status}
              </Badge>
            </div>
          ))}
        </div>
      </Card>
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <Team />
      </Suspense>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <RoleGate roles={["ADMIN"]}>
      <SettingsPageContent />
    </RoleGate>
  );
}
