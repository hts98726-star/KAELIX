import Link from "next/link";
import { ArrowRight, Database, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function WorkspaceHeading({
  title,
  description,
  action = "checkout",
}: {
  title: string;
  description: string;
  action?: "checkout" | "signup" | "subscription" | "none";
}) {
  const links = {
    checkout: { href: "/checkout", label: "New checkout" },
    signup: { href: "/signup", label: "Create account" },
    subscription: { href: "/subscriptions/new", label: "New subscription" },
  } as const;
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <Badge className="mb-3">
          <span className="mr-1.5 size-1.5 rounded-full bg-emerald-500" />
          Connected workspace
        </Badge>
        <h1 className="text-3xl font-semibold tracking-tight">
          {title}
          <span className="text-primary">.</span>
        </h1>
        <p className="mt-2 max-w-xl text-xs leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
      {action !== "none" && (
        <Button asChild>
          <Link href={links[action].href}>
            <Plus />
            {links[action].label}
          </Link>
        </Button>
      )}
    </div>
  );
}
export function WorkspaceEmpty({
  title,
  description,
  href = "/checkout",
  label = "Create a subscription",
}: {
  title: string;
  description: string;
  href?: string;
  label?: string;
}) {
  return (
    <div className="flex flex-col items-center px-5 py-16 text-center">
      <span className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-accent text-primary">
        <Database className="size-5" />
      </span>
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="mt-2 max-w-sm text-xs leading-6 text-muted-foreground">
        {description}
      </p>
      <Button asChild className="mt-5" variant="outline">
        <Link href={href}>
          {label}
          <ArrowRight />
        </Link>
      </Button>
    </div>
  );
}
export function WorkspaceUnavailable() {
  return (
    <Card>
      <WorkspaceEmpty
        title="Workspace data is unavailable"
        description="We couldn’t load the database. Please try again in a moment."
        href="/settings"
        label="Workspace details"
      />
    </Card>
  );
}
