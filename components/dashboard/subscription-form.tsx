"use client";

import { useState } from "react";
import { Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Plan, Subscription } from "@/lib/dashboard/types";

const prices: Record<Plan, number> = {
  Starter: 29,
  Professional: 79,
  Enterprise: 199,
};

export function SubscriptionForm({
  onCreate,
}: {
  onCreate: (subscription: Subscription) => void;
}) {
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState<Plan>("Professional");

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const customer = String(form.get("customer") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    if (!customer || !email) return;
    onCreate({
      id: `DEMO-${crypto.randomUUID()}`,
      customer,
      email,
      initials: customer
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase(),
      color: "violet",
      plan,
      status: "Trial",
      nextBilling: String(form.get("nextBilling")),
      amount: prices[plan],
    });
    setOpen(false);
    setPlan("Professional");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          New subscription
        </Button>
      </DialogTrigger>
      <DialogContent>
        <span className="mb-4 flex size-10 items-center justify-center rounded-xl bg-accent text-primary">
          <Sparkles className="size-5" />
        </span>
        <DialogTitle className="text-xl font-semibold">
          A new beginning.
        </DialogTitle>
        <DialogDescription className="mt-2 text-xs leading-6 text-muted-foreground">
          Add a demo subscription to this view. This temporary record resets on
          navigation or refresh.
        </DialogDescription>
        <form onSubmit={submit} className="mt-5 space-y-4">
          <div>
            <label
              htmlFor="customer"
              className="mb-1.5 block text-xs font-medium"
            >
              Customer name
            </label>
            <Input
              id="customer"
              name="customer"
              placeholder="e.g. Alex Morgan"
              required
              maxLength={80}
              pattern=".*\S.*"
            />
          </div>
          <div>
            <label htmlFor="email" className="mb-1.5 block text-xs font-medium">
              Email address
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="alex@company.com"
              required
              maxLength={160}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="plan"
                className="mb-1.5 block text-xs font-medium"
              >
                Plan
              </label>
              <Select
                value={plan}
                onValueChange={(value) => setPlan(value as Plan)}
              >
                <SelectTrigger id="plan" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(prices).map(([name, price]) => (
                    <SelectItem key={name} value={name}>
                      {name} · ${price}/mo
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label
                htmlFor="nextBilling"
                className="mb-1.5 block text-xs font-medium"
              >
                Next billing date
              </label>
              <Input
                id="nextBilling"
                name="nextBilling"
                type="date"
                defaultValue="2026-11-14"
                required
              />
            </div>
          </div>
          <div className="rounded-lg bg-accent p-3 text-xs leading-5 text-primary">
            All demo subscriptions start in Trial. No billing or payment action
            is performed.
          </div>
          <Button type="submit" className="w-full">
            <Plus />
            Add demo subscription
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
