import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/dashboard/brand";
import { LoginForm } from "@/components/auth/login-form";
import { getCurrentUser } from "@/lib/auth/session";
import { roleHome } from "@/lib/auth/roles";
export const metadata: Metadata = { title: "Log in" };
async function Login({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string; reset?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect(roleHome(user.role));
  const { registered, reset } = await searchParams;
  return (
    <main className="flex min-h-dvh flex-col bg-[#f8f6fd] px-6 py-8">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
        <Link href="/" aria-label="KAELIX PULSE home">
          <Brand />
        </Link>
        <Link
          href="/"
          className="flex items-center gap-2 text-xs text-muted-foreground"
        >
          <ArrowLeft className="size-3" />
          Back to welcome
        </Link>
      </div>
      <section className="mx-auto my-auto w-full max-w-[420px] py-12">
        <div className="rounded-2xl border bg-white p-7 shadow-[0_20px_70px_-45px_#7656df] sm:p-9">
          <span className="mb-6 flex size-11 items-center justify-center rounded-xl bg-accent text-primary">
            <ShieldCheck className="size-5" />
          </span>
          <p className="text-[10px] font-semibold tracking-[2px] text-primary">
            WELCOME BACK
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            Find your rhythm<span className="text-primary">.</span>
          </h1>
          <p className="mt-3 mb-7 text-xs leading-6 text-muted-foreground">
            Sign in to your KAELIX PULSE account.
          </p>
          {registered === "1" && (
            <p
              role="status"
              className="mb-5 rounded-lg bg-emerald-50 p-3 text-xs leading-6 text-emerald-700"
            >
              Your customer account was created. Log in to open your portal.
            </p>
          )}
          {reset === "1" && (
            <p
              role="status"
              className="mb-5 rounded-lg bg-emerald-50 p-3 text-xs leading-6 text-emerald-700"
            >
              Your password was reset. Log in with your new password.
            </p>
          )}
          <LoginForm />
          <p className="mt-4 text-center text-xs">
            <Link
              href="/forgot-password"
              className="font-medium text-primary hover:underline"
            >
              Forgot your password?
            </Link>
          </p>
          <p className="mt-7 border-t pt-5 text-center text-xs text-muted-foreground">
            New here?{" "}
            <Link
              href="/signup"
              className="font-medium text-primary hover:underline"
            >
              Create an account
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
export default function LoginPage(props: {
  searchParams: Promise<{ registered?: string; reset?: string }>;
}) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[#f8f6fd]" />}>
      <Login {...props} />
    </Suspense>
  );
}
