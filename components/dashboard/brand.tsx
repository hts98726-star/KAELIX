import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-[0_3px_8px_#7656df30]">
        <Activity className="size-5" strokeWidth={2.4} />
      </span>
      <span
        className={cn(
          "whitespace-nowrap text-[17px] font-bold tracking-[-0.7px]",
          compact && "hidden",
        )}
      >
        KAELIX <span className="font-medium text-primary">PULSE</span>
        <span className="mt-0.5 block text-[6px] font-medium tracking-[1.4px] text-muted-foreground">
          SUBSCRIPTIONS, SIMPLIFIED.
        </span>
      </span>
    </div>
  );
}
