"use client";

import Link from "next/link";
import { useActionState } from "react";

import { SubmitButton } from "@/components/submit-button";
import { Alert, Field, TextInput } from "@/components/ui";
import { loginAction } from "@/lib/actions/auth";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(loginAction, undefined);

  return (
    <form action={action} className="space-y-4" noValidate>
      {state?.message && <Alert tone="error">{state.message}</Alert>}
      {next && <input type="hidden" name="next" value={next} />}

      <Field label="Email" htmlFor="email" error={state?.errors?.email}>
        <TextInput
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </Field>

      <Field
        label="Password"
        htmlFor="password"
        error={state?.errors?.password}
      >
        <TextInput
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
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
