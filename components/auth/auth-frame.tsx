import Link from "next/link";
import { ArrowLeft, KeyRound } from "lucide-react";
import { Brand } from "@/components/dashboard/brand";

export function AuthFrame({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-dvh flex-col bg-[#f8f6fd] px-6 py-8">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
        <Link href="/" aria-label="KAELIX PULSE home">
          <Brand />
        </Link>
        <Link
          href="/login"
          className="flex items-center gap-2 text-xs text-muted-foreground"
        >
          <ArrowLeft className="size-3" />
          Back to log in
        </Link>
      </div>
      <section className="mx-auto my-auto w-full max-w-[420px] py-12">
        <div className="rounded-2xl border bg-white p-7 shadow-[0_20px_70px_-45px_#7656df] sm:p-9">
          <span className="mb-6 flex size-11 items-center justify-center rounded-xl bg-accent text-primary">
            <KeyRound className="size-5" />
          </span>
          <p className="text-[10px] font-semibold tracking-[2px] text-primary">
            {eyebrow}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            {title}
            <span className="text-primary">.</span>
          </h1>
          <p className="mt-3 mb-7 text-xs leading-6 text-muted-foreground">
            {description}
          </p>
          {children}
        </div>
      </section>
    </main>
  );
}
