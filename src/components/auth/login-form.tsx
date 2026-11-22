"use client";

import { useFeedbackAction } from "@/components/action-feedback";

import Link from "next/link";
import { useState } from "react";

import { SubmitButton } from "@/components/submit-button";
import { Alert, Field, TextInput } from "@/components/ui";
import { loginAction } from "@/lib/actions/auth";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useFeedbackAction(loginAction, undefined);
  const [email, setEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={action} className="space-y-4" noValidate>
      {state?.message && (
        <div role="alert">
          <Alert tone="error">{state.message}</Alert>
        </div>
      )}
      {next && <input type="hidden" name="next" value={next} />}

      <Field label="Email" htmlFor="email" error={state?.errors?.email}>
        <TextInput
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </Field>

      <Field
        label="Password"
        htmlFor="password"
        error={state?.errors?.password}
      >
        <div className="flex items-center gap-2">
          <TextInput
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
          />
          <button
            type="button"
            aria-controls="password"
            aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword(!showPassword)}
            className="min-h-10 shrink-0 rounded-lg border border-zinc-300 px-3 text-sm font-medium text-indigo-700 hover:bg-indigo-50 dark:border-zinc-700 dark:text-indigo-300 dark:hover:bg-indigo-950"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
      </Field>

      <div className="flex items-center justify-between text-sm">
        <Link
          href="/forgot-password"
          className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
        >
          Forgot password?
        </Link>
      </div>

      <SubmitButton className="w-full" pendingLabel="Signing in…">
        Sign in
      </SubmitButton>
    </form>
  );
}
