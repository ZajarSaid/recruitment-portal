"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/submit-button";
import { Alert, Field, TextInput } from "@/components/ui";
import { assignRecruiterAction } from "@/lib/actions/admin";

export function AssignRecruiterForm({
  jobId,
  currentEmail,
}: {
  jobId: string;
  currentEmail: string | null;
}) {
  const [state, action] = useActionState(assignRecruiterAction, undefined);

  return (
    <div className="space-y-2">
      {state?.message && (
        <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert>
      )}
      <form action={action} className="flex flex-wrap items-end gap-3" noValidate>
        <input type="hidden" name="jobId" value={jobId} />
        <div className="min-w-[16rem] flex-1">
          <Field
            label="Assigned recruiter email"
            htmlFor={`recruiterEmail-${jobId}`}
            error={state?.errors?.recruiterEmail}
            hint="Leave blank and save to clear the assignment."
          >
            <TextInput
              id={`recruiterEmail-${jobId}`}
              name="recruiterEmail"
              type="email"
              defaultValue={currentEmail ?? ""}
              placeholder="recruiter@zangohospital.go.tz"
            />
          </Field>
        </div>
        <SubmitButton pendingLabel="Saving…">Save assignment</SubmitButton>
      </form>
    </div>
  );
}
