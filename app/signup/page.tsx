import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Layers3,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Brand } from "@/components/dashboard/brand";
import { SignupForm } from "@/components/commerce/signup-form";

export const metadata: Metadata = { title: "Create account" };
export default function SignupPage() {
  return (
    <main
      id="main-content"
      className="min-h-dvh bg-white lg:grid lg:grid-cols-[1fr_1fr]"
    >
      <section className="relative hidden overflow-hidden bg-[#f1ecfc] p-12 lg:flex lg:min-h-dvh lg:flex-col xl:p-16">
        <Link href="/" aria-label="KAELIX PULSE home">
          <Brand />
        </Link>
        <div className="relative z-10 my-auto max-w-md py-20">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white/60 px-3 py-2 text-[10px] font-medium tracking-wide text-primary">
            <Sparkles className="size-3.5" />
            YOUR NEXT CHAPTER
          </span>
          <h1 className="text-5xl leading-[1.12] font-semibold tracking-[-2px] xl:text-6xl">
            Great things
            <br />
            start with a<br />
            <span className="text-primary">simple hello.</span>
          </h1>
          <p className="mt-6 max-w-sm text-sm leading-7 text-[#817690]">
            One place for your subscriptions, your customers, and the little
            details that keep business moving.
          </p>
          <div className="mt-10 space-y-4">
            {[
              "Subscriptions that stay in sync",
              "Clear billing, from the first invoice",
              "A workspace with room to grow",
            ].map((text) => (
              <p
                key={text}
                className="flex items-center gap-3 text-xs text-[#655974]"
              >
                <span className="flex size-5 items-center justify-center rounded-full bg-white">
                  <Check className="size-3 text-primary" />
                </span>
                {text}
              </p>
            ))}
          </div>
          <div className="mt-12 max-w-sm rounded-2xl border border-white/80 bg-white/65 p-5 shadow-[0_15px_50px_-30px_#7656df]">
            <div className="flex items-center justify-between">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-white">
                <Layers3 className="size-5" />
              </span>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-medium text-emerald-600">
                Built for momentum
              </span>
            </div>
            <p className="mt-4 text-sm font-medium">
              Less admin. More possibility.
            </p>
            <p className="mt-2 text-xs leading-6 text-muted-foreground">
              Your business, in rhythm. Every step of the way.
            </p>
          </div>
        </div>
        <p className="relative z-10 text-[10px] tracking-wide text-[#968aa8]">
          KAELIX PULSE · SUBSCRIPTIONS, SIMPLIFIED.
        </p>
        <div className="pointer-events-none absolute -right-36 -bottom-44 size-[560px] rounded-full border-[70px] border-white/25" />
      </section>
      <section className="flex min-h-dvh flex-col px-6 py-7 sm:px-12 lg:px-16 xl:px-24">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="size-3.5" />
            Back to welcome
          </Link>
          <ShieldCheck className="size-4 text-primary" />
        </div>
        <div className="mx-auto my-auto w-full max-w-[390px] py-12">
          <div className="mb-10 lg:hidden">
            <Brand />
          </div>
          <div className="mb-8">
            <p className="mb-3 text-[10px] font-semibold tracking-[2px] text-primary">
              WELCOME TO KAELIX
            </p>
            <h2 className="text-[30px] font-semibold tracking-[-1px]">
              A fresh start<span className="text-primary">.</span>
            </h2>
            <p className="mt-3 text-xs leading-6 text-muted-foreground">
              Create your customer account and get ready for what’s next.
            </p>
          </div>
          <SignupForm />
        </div>
        <Link
          href="/login"
          className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground hover:text-primary"
        >
          Already have an account? Log in
          <ArrowUpRight className="size-3" />
        </Link>
      </section>
    </main>
  );
}
