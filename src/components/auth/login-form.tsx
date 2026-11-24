"use client";

import { useFeedbackAction } from "@/components/action-feedback";

import Link from "next/link";
import { useState } from "react";

import { SubmitButton } from "@/components/submit-button";
import { Field, TextInput } from "@/components/ui";
import { loginAction } from "@/lib/actions/auth";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useFeedbackAction(loginAction, undefined);
  const [email, setEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={action} className="space-y-4" noValidate>
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
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-zinc-300 text-indigo-700 hover:bg-indigo-50 dark:border-zinc-700 dark:text-indigo-300 dark:hover:bg-indigo-950"
          >
            <svg
              aria-hidden="true"
              className="size-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {showPassword ? (
                <>
                  <path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                  <path d="M9.5 5.4A10.4 10.4 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3 3.7M6.2 6.2C3.6 8 2 12 2 12s4 7 10 7a10 10 0 0 0 5-1.5" />
                </>
              ) : (
                <>
                  <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </>
              )}
            </svg>
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

      <SubmitButton className="w-full" pendingLabel="Please wait…">
        Sign in
      </SubmitButton>
    </form>
  );
}
