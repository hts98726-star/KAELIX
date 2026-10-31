"use client";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Card className="mx-auto mt-12 max-w-lg p-10 text-center">
      <TriangleAlert className="mx-auto mb-4 size-8 text-primary" />
      <h1 className="text-xl font-semibold">Let’s try that again.</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Your workspace couldn’t load. Please retry to get back to your
        dashboard.
      </p>
      <Button className="mt-5" onClick={reset}>
        Reload workspace
      </Button>
    </Card>
  );
}
