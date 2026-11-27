"use client";

import { useState } from "react";

import { useFeedbackAction } from "@/components/action-feedback";
import { PasswordInput } from "@/components/auth/password-input";
import { SubmitButton } from "@/components/submit-button";
import { Field, TextInput } from "@/components/ui";
import {
  requestAdminCode,
  restartAdminSignIn,
  verifyAdminCode,
} from "@/lib/actions/admin-auth";

export function AdminSignInForm({ codePending }: { codePending: boolean }) {
  const [email, setEmail] = useState("");
  const [requestState, requestAction] = useFeedbackAction(
    requestAdminCode,
    undefined,
  );
  const [, restartAction] = useFeedbackAction(restartAdminSignIn, undefined);

  if (codePending) {
    return <AdminCodeForm restartAction={restartAction} />;
  }

  return (
    <form action={requestAction} className="space-y-4" noValidate>
      <Field
        label="Email"
        htmlFor="admin-email"
        error={requestState?.errors?.email}
      >
        <TextInput
          id="admin-email"
          placeholder="you@example.com"
          name="email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </Field>
      <Field
        label="Password"
        htmlFor="admin-password"
        error={requestState?.errors?.password}
      >
        <PasswordInput
          id="admin-password"
          name="password"
          placeholder="Enter your password"
          autoComplete="current-password"
          required
        />
      </Field>
      <SubmitButton className="w-full" pendingLabel="Sending code…">
        Email me a sign-in code
      </SubmitButton>
    </form>
  );
}

function AdminCodeForm({
  restartAction,
}: {
  restartAction: (data: FormData) => void;
}) {
  const [state, action] = useFeedbackAction(verifyAdminCode, undefined);
  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-600 dark:text-zinc-300">
        Enter the six-digit code sent to your email. It expires in 10 minutes.
      </p>
      <form action={action} className="space-y-4" noValidate>
        <Field
          label="Sign-in code"
          htmlFor="admin-code"
          error={state?.errors?.code}
        >
          <TextInput
            id="admin-code"
            placeholder="Enter your six-digit code"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            required
          />
        </Field>
        <SubmitButton className="w-full" pendingLabel="Verifying…">
          Verify and sign in
        </SubmitButton>
      </form>
      <form action={restartAction}>
        <SubmitButton pendingLabel="Restarting…">
          Start again or request a new code
        </SubmitButton>
      </form>
    </div>
  );
}
