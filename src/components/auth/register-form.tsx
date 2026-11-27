"use client";

import { useFeedbackAction } from "@/components/action-feedback";

import Link from "next/link";

import { PasswordInput } from "@/components/auth/password-input";
import { SubmitButton } from "@/components/submit-button";
import { Field, TextInput } from "@/components/ui";
import { registerAction } from "@/lib/actions/auth";

export function RegisterForm() {
  const [state, action] = useFeedbackAction(registerAction, undefined);

  return (
    <form action={action} className="space-y-4" noValidate>

      <Field label="Full name" htmlFor="name" error={state?.errors?.name}>
        <TextInput
          id="name"
          placeholder="Enter your full name"
          name="name"
          autoComplete="name"
          required
        />
      </Field>

      <Field label="Email" htmlFor="email" error={state?.errors?.email}>
        <TextInput
          id="email"
          placeholder="you@example.com"
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
        <PasswordInput
          id="password"
          name="password"
          placeholder="Enter a new password"
          autoComplete="new-password"
          required
        />
      </Field>

      <Field
        label="Confirm password"
        htmlFor="confirmPassword"
        error={state?.errors?.confirmPassword}
      >
        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          toggleLabel="password confirmation"
          placeholder="Re-enter your password"
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
