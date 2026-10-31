import type { Metadata } from "next";
import { SubscriptionWorkspace } from "@/components/dashboard/subscription-workspace";
import { mockSubscriptions } from "@/lib/dashboard/mock-data";
export const metadata: Metadata = { title: "Subscriptions" };
export default function SubscriptionsPage() {
  return <SubscriptionWorkspace initialSubscriptions={mockSubscriptions} />;
}
