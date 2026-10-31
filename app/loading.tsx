import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading dashboard">
      <span className="sr-only">Loading your workspace…</span>
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Card key={i} className="space-y-5 p-5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-3 w-40" />
          </Card>
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[2fr_1fr]">
        <Card className="p-6">
          <Skeleton className="mb-6 h-5 w-40" />
          <Skeleton className="h-64 w-full" />
        </Card>
        <Card className="flex items-center justify-center p-6">
          <Skeleton className="size-48 rounded-full" />
        </Card>
      </div>
      <Card className="space-y-6 p-6">
        <Skeleton className="h-5 w-48" />
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </Card>
    </div>
  );
}
