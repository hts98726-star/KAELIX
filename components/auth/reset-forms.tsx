"use client";
import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";
import { requestPasswordReset, resetPassword } from "@/actions/password";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function Message({ state }: { state: { message: string; success?: boolean } }) {
  if (!state.message) return null;
  return (
    <p
      role={state.success ? "status" : "alert"}
      className={`rounded-lg px-4 py-3 text-xs leading-6 ${state.success ? "bg-emerald-50 text-emerald-700" : "border border-rose-100 bg-rose-50 text-rose-700"}`}
    >
      {state.message}
    </p>
  );
}
export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, {
    message: "",
  });
  return (
    <form
      action={action}
      aria-label="Request password reset"
      className="space-y-5"
    >
      <div>
        <label htmlFor="reset-email" className="mb-2 block text-xs font-medium">
          Email address
        </label>
        <Input
          id="reset-email"
          name="email"
          type="email"
          required
          maxLength={254}
          autoComplete="username"
          disabled={pending}
          className="h-12 text-sm"
        />
      </div>
      <Message state={state} />
      <Button type="submit" disabled={pending} className="h-12 w-full">
        {pending && <LoaderCircle className="animate-spin" />}
        Send reset link
      </Button>
    </form>
  );
}
export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPassword, {
    message: "",
  });
  return (
    <form
      action={action}
      aria-label="Choose a new password"
      className="space-y-5"
    >
      <input type="hidden" name="token" value={token} />
      <div>
        <label
          htmlFor="new-password"
          className="mb-2 block text-xs font-medium"
        >
          New password
        </label>
        <Input
          id="new-password"
          name="password"
          type="password"
          required
          minLength={9}
          maxLength={72}
          autoComplete="new-password"
          disabled={pending}
          className="h-12 text-sm"
        />
        <p className="mt-2 text-[10px] leading-5 text-muted-foreground">
          More than 8 characters, with uppercase, lowercase, and a special
          character.
        </p>
      </div>
      <div>
        <label
          htmlFor="confirm-new-password"
          className="mb-2 block text-xs font-medium"
        >
          Confirm new password
        </label>
        <Input
          id="confirm-new-password"
          name="confirmPassword"
          type="password"
          required
          maxLength={72}
          autoComplete="new-password"
          disabled={pending}
          className="h-12 text-sm"
        />
      </div>
      <Message state={state} />
      <Button type="submit" disabled={pending} className="h-12 w-full">
        {pending && <LoaderCircle className="animate-spin" />}
        Reset password
      </Button>
    </form>
  );
}
