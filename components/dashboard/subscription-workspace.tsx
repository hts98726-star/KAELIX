"use client";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { SubscriptionForm } from "./subscription-form";
import { SubscriptionsTable } from "./subscriptions-table";
import type { Subscription } from "@/lib/dashboard/types";

export function SubscriptionWorkspace({
  initialSubscriptions,
}: {
  initialSubscriptions: Subscription[];
}) {
  const [subscriptions, setSubscriptions] = useState(initialSubscriptions);
  const [message, setMessage] = useState("");
  return (
    <div className="page-enter space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Badge className="mb-3">Sample data</Badge>
          <h1 className="text-3xl font-semibold tracking-tight">
            Subscriptions<span className="text-primary">.</span>
          </h1>
          <p className="mt-2 text-xs text-muted-foreground">
            Every customer. Every plan. All in one place.
          </p>
        </div>
        <SubscriptionForm
          onCreate={(s) => {
            setSubscriptions((current) => [s, ...current]);
            setMessage(
              `${s.customer}’s demo subscription was added. This record resets on navigation or refresh.`,
            );
          }}
        />
      </div>
      {message && (
        <p
          role="status"
          className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-700"
        >
          {message}
        </p>
      )}
      <SubscriptionsTable
        subscriptions={subscriptions}
        title="All subscriptions"
        showViewAll={false}
      />
    </div>
  );
}
