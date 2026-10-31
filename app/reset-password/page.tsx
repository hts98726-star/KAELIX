import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthFrame } from "@/components/auth/auth-frame";
import { ResetPasswordForm } from "@/components/auth/reset-forms";

export const metadata: Metadata = { title: "Reset password" };
async function ResetForm({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (typeof token !== "string" || !token)
    return (
      <p className="text-xs leading-6 text-muted-foreground">
        This reset link is incomplete.{" "}
        <Link
          href="/forgot-password"
          className="font-medium text-primary hover:underline"
        >
          Request a new one
        </Link>
        .
      </p>
    );
  return <ResetPasswordForm token={token} />;
}
export default function ResetPasswordPage(props: {
  searchParams: Promise<{ token?: string }>;
}) {
  return (
    <AuthFrame
      eyebrow="ACCOUNT RECOVERY"
      title="Choose a new password"
      description="After the reset, every existing session for your account is signed out."
    >
      <Suspense
        fallback={<p className="text-xs text-muted-foreground">Loading…</p>}
      >
        <ResetForm {...props} />
      </Suspense>
    </AuthFrame>
  );
}
