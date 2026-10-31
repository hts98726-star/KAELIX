import type { Metadata } from "next";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  CustomerAvatar,
  StatusBadge,
} from "@/components/dashboard/subscriptions-table";
import { mockSubscriptions } from "@/lib/dashboard/mock-data";

export const metadata: Metadata = { title: "Customers" };
export default function CustomersPage() {
  return (
    <div className="page-enter space-y-6">
      <div>
        <Badge className="mb-3">Sample data</Badge>
        <h1 className="text-3xl font-semibold tracking-tight">
          Good company<span className="text-primary">.</span>
        </h1>
        <p className="mt-2 text-xs text-muted-foreground">
          Meet the people behind your subscriptions.
        </p>
      </div>
      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 border-b p-5 text-sm font-semibold">
          <Users className="size-4 text-primary" />
          Customers <Badge>{mockSubscriptions.length}</Badge>
        </div>
        <div className="grid divide-y sm:grid-cols-2">
          {mockSubscriptions.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-3 p-5">
              <CustomerAvatar subscription={s} />
              <div className="min-w-0 flex-1">
                <h2 className="text-xs font-medium">{s.customer}</h2>
                <p className="mt-1 truncate text-[10px] text-muted-foreground">
                  {s.email}
                </p>
              </div>
              <StatusBadge status={s.status} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
