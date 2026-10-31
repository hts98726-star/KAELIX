import type { Metadata } from "next";
import { AuthFrame } from "@/components/auth/auth-frame";
import { ForgotPasswordForm } from "@/components/auth/reset-forms";

export const metadata: Metadata = { title: "Forgot password" };
export default function ForgotPasswordPage() {
  return (
    <AuthFrame
      eyebrow="ACCOUNT RECOVERY"
      title="Forgot your password"
      description="Enter your account email. We’ll send a single-use link that lets you choose a new password."
    >
      <ForgotPasswordForm />
    </AuthFrame>
  );
}
