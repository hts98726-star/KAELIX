import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { titleCase } from "@/lib/commerce/rules";
import { cn } from "@/lib/utils";

const variants: Record<
  string,
  "default" | "secondary" | "success" | "warning" | "destructive"
> = {
  DRAFT: "secondary",
  QUOTATION: "default",
  CONFIRMED: "warning",
  ACTIVE: "success",
  PAUSED: "warning",
  CLOSED: "secondary",
  PAID: "success",
  CANCELLED: "secondary",
  OVERDUE: "destructive",
};
export function StatusPill({ status }: { status: string }) {
  return (
    <Badge variant={variants[status] ?? "secondary"}>
      <span className="size-1 rounded-full bg-current" />
      {titleCase(status)}
    </Badge>
  );
}

/** Server-rendered filter chips and pagination driven by URL search params. */
export function FilterChips({
  base,
  options,
  current,
  counts,
  q,
}: {
  base: string;
  options: string[];
  current: string;
  counts: Record<string, number>;
  q: string;
}) {
  const href = (status: string) => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (q) params.set("q", q);
    const query = params.toString();
    return query ? `${base}?${query}` : base;
  };
  return (
    <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
      {["", ...options].map((status) => (
        <Link
          key={status || "all"}
          href={href(status)}
          aria-current={current === status ? "page" : undefined}
          className={cn(
            "rounded-full border px-3 py-1.5 text-[11px] transition-colors",
            current === status
              ? "border-primary bg-accent font-medium text-primary"
              : "bg-white text-muted-foreground hover:bg-accent",
          )}
        >
          {status ? titleCase(status) : "All"}
          {status && counts[status] !== undefined && (
            <span className="ml-1.5 tabular-nums opacity-70">
              {counts[status]}
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
}
export function Pager({
  base,
  page,
  pageCount,
  total,
  params,
}: {
  base: string;
  page: number;
  pageCount: number;
  total: number;
  params: Record<string, string>;
}) {
  const href = (n: number) => {
    const search = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v),
    );
    if (n > 1) search.set("page", String(n));
    const query = search.toString();
    return query ? `${base}?${query}` : base;
  };
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-muted-foreground">
      <span>
        Page {page} of {pageCount} · {total} record{total === 1 ? "" : "s"}
      </span>
      <span className="flex gap-2">
        {page > 1 && (
          <Link
            href={href(page - 1)}
            className="rounded-lg border bg-white px-3 py-1.5 hover:bg-accent"
          >
            Previous
          </Link>
        )}
        {page < pageCount && (
          <Link
            href={href(page + 1)}
            className="rounded-lg border bg-white px-3 py-1.5 hover:bg-accent"
          >
            Next
          </Link>
        )}
      </span>
    </div>
  );
}
export function SearchBox({
  base,
  q,
  status,
  placeholder,
}: {
  base: string;
  q: string;
  status: string;
  placeholder: string;
}) {
  return (
    <form action={base} className="flex gap-2" role="search">
      {status && <input type="hidden" name="status" value={status} />}
      <input
        name="q"
        defaultValue={q}
        aria-label="Search records"
        placeholder={placeholder}
        maxLength={100}
        className="h-9 w-full min-w-0 rounded-lg border bg-white px-3 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-72"
      />
      <button
        type="submit"
        className="h-9 rounded-lg border bg-white px-3 text-xs hover:bg-accent"
      >
        Search
      </button>
    </form>
  );
}
