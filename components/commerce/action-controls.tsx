"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Result = { success: boolean; message: string; id?: string };

export function ResultMessage({
  result,
  label = "Action result",
}: {
  result: Result | null;
  label?: string;
}) {
  if (!result) return null;
  return (
    <p
      role={result.success ? "status" : "alert"}
      aria-label={label}
      className={cn(
        "rounded-lg px-3 py-2.5 text-xs leading-6",
        result.success
          ? "bg-emerald-50 text-emerald-700"
          : "bg-rose-50 text-rose-700",
      )}
    >
      {result.message}
    </p>
  );
}

/** A form bound to a server action: shows the result, then refreshes server data. */
export function ActionForm({
  action,
  submitLabel,
  children,
  className,
  ariaLabel,
  resetOnSuccess = true,
}: {
  action: (formData: FormData) => Promise<Result>;
  submitLabel: string;
  children: React.ReactNode;
  className?: string;
  ariaLabel: string;
  resetOnSuccess?: boolean;
}) {
  const ref = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<Result | null>(null);
  return (
    <form
      ref={ref}
      aria-label={ariaLabel}
      className={cn("space-y-4", className)}
      onSubmit={(event) => {
        event.preventDefault();
        if (pending) return;
        const data = new FormData(event.currentTarget);
        setResult(null);
        startTransition(async () => {
          try {
            const response = await action(data);
            setResult(response);
            if (response.success) {
              if (resetOnSuccess) ref.current?.reset();
              router.refresh();
            }
          } catch {
            setResult({
              success: false,
              message: "We couldn’t reach the server. Please try again.",
            });
          }
        });
      }}
    >
      <fieldset disabled={pending} className="space-y-4">
        {children}
      </fieldset>
      <ResultMessage result={result} label={`${ariaLabel} result`} />
      <Button type="submit" disabled={pending} className="w-full">
        {pending && <LoaderCircle className="animate-spin" />}
        {submitLabel}
      </Button>
    </form>
  );
}

/** One-click server action (already bound to its arguments on the server). */
export function ActionButton({
  action,
  label,
  variant = "outline",
  confirm,
  size = "sm",
}: {
  action: () => Promise<Result>;
  label: string;
  variant?: "default" | "outline" | "ghost";
  confirm?: string;
  size?: "sm" | "default";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<Result | null>(null);
  return (
    <span className="inline-flex flex-col gap-2">
      <Button
        type="button"
        size={size}
        variant={variant}
        disabled={pending}
        onClick={() => {
          if (confirm && !window.confirm(confirm)) return;
          setResult(null);
          startTransition(async () => {
            try {
              const response = await action();
              setResult(response);
              if (response.success) router.refresh();
            } catch {
              setResult({
                success: false,
                message: "We couldn’t reach the server. Please try again.",
              });
            }
          });
        }}
      >
        {pending && <LoaderCircle className="animate-spin" />}
        {label}
      </Button>
      <ResultMessage result={result} label={`${label} result`} />
    </span>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium">
        {label}
      </label>
      {children}
      {hint && (
        <p className="mt-1.5 text-[10px] leading-5 text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}

export const nativeSelect =
  "h-10 w-full rounded-lg border bg-white px-3 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60";
