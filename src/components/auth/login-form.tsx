"use client";

import { useFeedbackAction } from "@/components/action-feedback";

import Link from "next/link";
import { useState } from "react";

import { PasswordInput } from "@/components/auth/password-input";
import { SubmitButton } from "@/components/submit-button";
import { Field, TextInput } from "@/components/ui";
import { loginAction } from "@/lib/actions/auth";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useFeedbackAction(loginAction, undefined);
  const [email, setEmail] = useState("");

  return (
    <form action={action} className="space-y-4" noValidate>
      {next && <input type="hidden" name="next" value={next} />}

      <Field label="Email" htmlFor="email" error={state?.errors?.email}>
        <TextInput
          id="email"
          placeholder="you@example.com"
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
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          placeholder="Enter your password"
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

      <SubmitButton className="w-full" pendingLabel="Please wait…">
        Sign in
      </SubmitButton>
    </form>
  );
}
