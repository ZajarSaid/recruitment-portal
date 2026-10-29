"use client";

import Link from "next/link";
import { useActionState } from "react";

import { SubmitButton } from "@/components/submit-button";
import { Alert, Field, TextInput } from "@/components/ui";
import { forgotPasswordAction } from "@/lib/actions/auth";

export function ForgotPasswordForm() {
  const [state, action] = useActionState(forgotPasswordAction, undefined);

  return (
    <form action={action} className="space-y-4" noValidate>
      {state?.message && (
        <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert>
      )}

      {state?.resetLink && (
        <Alert tone="info">
          <p className="font-medium">Development reset link</p>
          <p className="mt-1 break-all text-xs">
            Email delivery is not configured. Use this link to reset the
            password:
          </p>
          <Link href={state.resetLink} className="mt-1 block break-all underline">
            {state.resetLink}
          </Link>
        </Alert>
      )}

      <Field label="Email" htmlFor="email" error={state?.errors?.email}>
        <TextInput
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </Field>

      <SubmitButton className="w-full" pendingLabel="Submitting…">
        Send reset link
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
