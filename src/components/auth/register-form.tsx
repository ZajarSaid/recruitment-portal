"use client";

import Link from "next/link";
import { useActionState } from "react";

import { SubmitButton } from "@/components/submit-button";
import { Alert, Field, TextInput } from "@/components/ui";
import { registerAction } from "@/lib/actions/auth";

export function RegisterForm() {
  const [state, action] = useActionState(registerAction, undefined);

  return (
    <form action={action} className="space-y-4" noValidate>
      {state?.message && <Alert tone="error">{state.message}</Alert>}

      <Field label="Full name" htmlFor="name" error={state?.errors?.name}>
        <TextInput
          id="name"
          name="name"
          autoComplete="name"
          required
        />
      </Field>

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
        hint="At least 8 characters with at least one letter and one number."
      >
        <TextInput
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
        />
      </Field>

      <Field
        label="Confirm password"
        htmlFor="confirmPassword"
        error={state?.errors?.confirmPassword}
      >
        <TextInput
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
        />
      </Field>

      <SubmitButton className="w-full" pendingLabel="Creating account…">
        Create account
      </SubmitButton>

      <p className="text-center text-sm text-zinc-600 dark:text-zinc-300">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-zinc-900 underline dark:text-zinc-100"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
