"use client";

import Link from "next/link";
import { useActionState } from "react";

import { SubmitButton } from "@/components/submit-button";
import { Alert, Field, TextInput } from "@/components/ui";
import { resetPasswordAction } from "@/lib/actions/auth";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPasswordAction, undefined);

  return (
    <form action={action} className="space-y-4" noValidate>
      {state?.message && <Alert tone="error">{state.message}</Alert>}
      {state?.errors?.token && (
        <Alert tone="error">{state.errors.token.join(" ")}</Alert>
      )}

      <input type="hidden" name="token" value={token} />

      <Field
        label="New password"
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
        label="Confirm new password"
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

      <SubmitButton className="w-full" pendingLabel="Resetting…">
        Reset password
      </SubmitButton>

      <p className="text-center text-sm text-zinc-600 dark:text-zinc-300">
        <Link
          href="/login"
          className="font-medium text-zinc-900 underline dark:text-zinc-100"
        >
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
