"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  LoaderCircle,
} from "lucide-react";
import { registerUser } from "@/actions/auth";
import type { RegistrationResult } from "@/lib/commerce/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: RegistrationResult = { success: false, message: "" };
export function SignupForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [visible, setVisible] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (_previous: RegistrationResult, form: FormData) => {
      if (form.get("password") !== form.get("confirmPassword"))
        return {
          success: false,
          message: "Please check the highlighted fields.",
          errors: { confirmPassword: ["Your passwords don’t match."] },
        };
      try {
        return await registerUser(form);
      } catch {
        return {
          success: false,
          message: "We couldn’t reach the server. Please try again.",
        };
      }
    },
    initialState,
  );
  const rules = [
    { label: "8 or more characters", valid: password.length >= 8 },
    {
      label: "Uppercase & lowercase letters",
      valid: /[a-z]/.test(password) && /[A-Z]/.test(password),
    },
    { label: "A special character", valid: /[^a-zA-Z0-9]/.test(password) },
  ];
  if (state.success)
    return (
      <div role="status" className="py-6 text-center">
        <span className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="size-8" />
        </span>
        <h2 className="text-2xl font-semibold tracking-tight">
          You’re on the list.
        </h2>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Your account for{" "}
          <strong className="break-all font-medium text-foreground">
            {email}
          </strong>{" "}
          has been created. It’s ready to use when creating a subscription in
          this workspace.
        </p>
        <Button asChild className="mt-7 w-full">
          <Link href="/checkout">
            Continue to checkout
            <ArrowRight />
          </Link>
        </Button>
        <Button asChild variant="ghost" className="mt-2 w-full">
          <Link href="/customers">View customers</Link>
        </Button>
      </div>
    );
  return (
    <form action={formAction} className="space-y-5" aria-label="Create account">
      <div>
        <label
          htmlFor="signup-email"
          className="mb-2 block text-xs font-medium"
        >
          Email address
        </label>
        <Input
          id="signup-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          required
          maxLength={254}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={!!state.errors?.email}
          aria-describedby={state.errors?.email ? "email-error" : undefined}
          disabled={pending}
          className="h-12 text-sm"
        />
        {state.errors?.email && (
          <p id="email-error" className="mt-2 text-xs text-rose-600">
            {state.errors.email.join(" ")}
          </p>
        )}
      </div>
      <div>
        <label
          htmlFor="signup-password"
          className="mb-2 block text-xs font-medium"
        >
          Password
        </label>
        <div className="relative">
          <Input
            id="signup-password"
            name="password"
            type={visible ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={72}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={!!state.errors?.password}
            aria-describedby="password-rules password-error"
            disabled={pending}
            placeholder="Create a strong password"
            className="h-12 pr-12 text-sm"
          />
          <button
            type="button"
            onClick={() => setVisible(!visible)}
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-lg text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            {visible ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
        </div>
        <p id="password-error" className="mt-2 text-xs text-rose-600">
          {state.errors?.password?.join(" ")}
        </p>
        <ul id="password-rules" className="mt-3 grid gap-2">
          {rules.map((rule) => (
            <li
              key={rule.label}
              className={`flex items-center gap-2 text-[11px] ${rule.valid ? "text-emerald-600" : "text-muted-foreground"}`}
            >
              <Check
                className={`size-3 ${rule.valid ? "opacity-100" : "opacity-35"}`}
              />
              {rule.label}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <label
          htmlFor="signup-confirm"
          className="mb-2 block text-xs font-medium"
        >
          Confirm password
        </label>
        <Input
          id="signup-confirm"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={72}
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          aria-invalid={!!state.errors?.confirmPassword}
          aria-describedby={
            state.errors?.confirmPassword ? "confirm-error" : undefined
          }
          disabled={pending}
          placeholder="Enter your password again"
          className="h-12 text-sm"
        />
        {state.errors?.confirmPassword && (
          <p id="confirm-error" className="mt-2 text-xs text-rose-600">
            {state.errors.confirmPassword.join(" ")}
          </p>
        )}
      </div>
      {state.message && (
        <div
          role="alert"
          aria-label="Registration error"
          className="rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-xs leading-6 text-rose-700"
        >
          {state.message}
        </div>
      )}
      <Button type="submit" disabled={pending} className="h-12 w-full text-sm">
        {pending ? (
          <>
            <LoaderCircle className="animate-spin" />
            Creating account…
          </>
        ) : (
          <>
            Create account
            <ArrowRight />
          </>
        )}
      </Button>
      <p className="text-center text-[11px] leading-6 text-muted-foreground">
        An account is created when you submit this form. Checkout is a separate
        step.
      </p>
    </form>
  );
}
