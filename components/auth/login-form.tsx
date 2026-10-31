"use client";
import { useActionState, useState } from "react";
import { ArrowRight, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { loginUser } from "@/actions/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export function LoginForm() {
  const [state, action, pending] = useActionState(loginUser, { message: "" });
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  return (
    <form action={action} aria-label="Log in" className="space-y-5">
      <div>
        <label htmlFor="login-email" className="mb-2 block text-xs font-medium">
          Email address
        </label>
        <Input
          id="login-email"
          name="email"
          type="email"
          required
          autoComplete="username"
          maxLength={254}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={pending}
          placeholder="you@company.com"
          className="h-12 text-sm"
        />
      </div>
      <div>
        <label
          htmlFor="login-password"
          className="mb-2 block text-xs font-medium"
        >
          Password
        </label>
        <div className="relative">
          <Input
            id="login-password"
            name="password"
            type={visible ? "text" : "password"}
            autoComplete="current-password"
            required
            maxLength={72}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={pending}
            className="h-12 pr-12 text-sm"
          />
          <button
            type="button"
            aria-label={visible ? "Hide password" : "Show password"}
            onClick={() => setVisible(!visible)}
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-lg text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            {visible ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
        </div>
      </div>
      {state.message && (
        <p
          role="alert"
          aria-label="Login error"
          className="rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-xs leading-6 text-rose-700"
        >
          {state.message}
        </p>
      )}
      <Button type="submit" disabled={pending} className="h-12 w-full">
        {pending ? (
          <>
            <LoaderCircle className="animate-spin" />
            Signing in…
          </>
        ) : (
          <>
            Log in
            <ArrowRight />
          </>
        )}
      </Button>
      <p className="text-center text-[11px] leading-6 text-muted-foreground">
        You’ll be taken to the workspace assigned to your account.
      </p>
    </form>
  );
}
