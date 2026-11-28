"use client";

import { confirmForm, useFeedbackAction } from "@/components/action-feedback";
import { PasswordInput } from "@/components/auth/password-input";
import { SubmitButton } from "@/components/submit-button";
import { Field, Select, TextInput } from "@/components/ui";
import { createStaffAction } from "@/lib/actions/admin";
import { ROLE_LABELS, STAFF_ROLES } from "@/lib/roles";

export function CreateStaffForm() {
  const [state, action] = useFeedbackAction(createStaffAction, undefined);
  return (
    <form
      action={action}
      onSubmit={(event) =>
        confirmForm(
          event,
          "Create this staff account with the selected role?",
          "Create staff account",
        )
      }
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Full name"
          htmlFor="staff-name"
          error={state?.errors?.name}
        >
          <TextInput id="staff-name" name="name" required />
        </Field>
        <Field label="Email" htmlFor="staff-email" error={state?.errors?.email}>
          <TextInput id="staff-email" name="email" type="email" required />
        </Field>
        <Field
          label="Initial password"
          htmlFor="staff-password"
          error={state?.errors?.password}
          hint="Use at least eight characters, including a letter and a number."
        >
          <PasswordInput
            id="staff-password"
            name="password"
            autoComplete="new-password"
            required
          />
        </Field>
        <Field
          label="Confirm password"
          htmlFor="staff-confirm-password"
          error={state?.errors?.confirmPassword}
        >
          <PasswordInput
            id="staff-confirm-password"
            name="confirmPassword"
            autoComplete="new-password"
            required
          />
        </Field>
      </div>
      <Field label="Role" htmlFor="staff-role" error={state?.errors?.role}>
        <Select id="staff-role" name="role" defaultValue="RECRUITER" required>
          {STAFF_ROLES.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
            </option>
          ))}
        </Select>
      </Field>
      <SubmitButton pendingLabel="Creating account…">
        Create staff account
      </SubmitButton>
    </form>
  );
}
