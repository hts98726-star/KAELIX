import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ArrowRight, Layers3, ShieldCheck, Sparkles } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { roleHome } from "@/lib/auth/roles";
import { Brand } from "@/components/dashboard/brand";
import { Button } from "@/components/ui/button";
async function Entry() {
  const user = await getCurrentUser();
  if (user) redirect(roleHome(user.role));
  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-[#f8f6fd] px-6 py-8 sm:px-12 lg:px-20">
      <header className="relative z-10 flex items-center justify-between gap-4">
        <Brand />
        <Button variant="outline" asChild>
          <Link href="/login">
            Log in
            <ArrowRight />
          </Link>
        </Button>
      </header>
      <div className="relative z-10 mx-auto my-auto w-full max-w-3xl py-20 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white px-4 py-2 text-[10px] font-medium tracking-wider text-primary">
          <Sparkles className="size-3.5" />
          YOUR BUSINESS, IN RHYTHM
        </span>
        <h1 className="mt-8 text-4xl leading-tight font-semibold tracking-[-1.5px] sm:text-6xl">
          A little less admin.
          <br />
          <span className="text-primary">A lot more possibility.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-lg text-sm leading-7 text-muted-foreground">
          Subscriptions, customers, and billing, together in one thoughtful
          workspace. Sign in to pick up where you left off.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Button asChild className="h-12 px-8">
            <Link href="/login">
              Log in to your account
              <ArrowRight />
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-12 px-8">
            <Link href="/signup">Create account</Link>
          </Button>
        </div>
        <div className="mx-auto mt-14 grid max-w-xl gap-4 text-left sm:grid-cols-2">
          {[
            {
              Icon: Layers3,
              title: "Everything in its place",
              text: "A clear view of subscriptions and invoices.",
            },
            {
              Icon: ShieldCheck,
              title: "A workspace of your own",
              text: "Secure sign-in and access based on your role.",
            },
          ].map(({ Icon, title, text }) => (
            <div key={title} className="rounded-2xl border bg-white/80 p-5">
              <Icon className="mb-3 size-5 text-primary" />
              <h2 className="text-xs font-semibold">{title}</h2>
              <p className="mt-2 text-xs leading-6 text-muted-foreground">
                {text}
              </p>
            </div>
          ))}
        </div>
      </div>
      <footer className="relative z-10 text-center text-[10px] text-muted-foreground">
        © 2026 KAELIX PULSE · Subscriptions, simplified.
      </footer>
      <div className="pointer-events-none absolute -right-40 -bottom-52 size-[650px] rounded-full border-[90px] border-primary/5" />
    </main>
  );
}
export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[#f8f6fd]" />}>
      <Entry />
    </Suspense>
  );
}
