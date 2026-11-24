"use client";

import { confirmForm, useFeedbackAction } from "@/components/action-feedback";

import { SubmitButton } from "@/components/submit-button";
import { Field, Select, TextArea } from "@/components/ui";
import { updateApplicationStatusAction } from "@/lib/actions/recruiter";

const LABELS: Record<string, string> = {
  UNDER_REVIEW: "Move to Under Review",
  SHORTLISTED: "Shortlist",
  REJECTED: "Reject",
};

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  SUBMITTED: ["UNDER_REVIEW", "SHORTLISTED", "REJECTED"],
  UNDER_REVIEW: ["SHORTLISTED", "REJECTED"],
  SHORTLISTED: ["UNDER_REVIEW", "REJECTED"],
  REJECTED: ["UNDER_REVIEW", "SHORTLISTED"],
};

export function ApplicationStatusForm({
  applicationId,
  current,
}: {
  applicationId: string;
  current: string;
}) {
  const [state, action] = useFeedbackAction(
    updateApplicationStatusAction,
    undefined,
  );
  const options = ALLOWED_TRANSITIONS[current] ?? [];

  if (options.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        No status changes are available for this application.
      </p>
    );
  }

  return (
    <form
      action={action}
      onSubmit={(event) =>
        confirmForm(
          event,
          "Apply the selected status to this application?",
          "Update status",
        )
      }
      className="space-y-3"
      noValidate
    >
      <input type="hidden" name="applicationId" value={applicationId} />

      <div className="flex flex-wrap items-end gap-3">
        <Field
          label="Change status to"
          htmlFor="toStatus"
          error={state?.errors?.toStatus}
        >
          <Select id="toStatus" name="toStatus" defaultValue={options[0]}>
            {options.map((value) => (
              <option key={value} value={value}>
                {LABELS[value] ?? value}
              </option>
            ))}
          </Select>
        </Field>

        <div className="w-full min-w-0 sm:flex-1">
          <Field
            label="Review note (optional)"
            htmlFor="note"
            hint="Shared with the candidate if you reject the application."
            error={state?.errors?.note}
          >
            <TextArea
              id="note"
              name="note"
              rows={2}
              placeholder="Add a review note…"
            />
          </Field>
        </div>
      </div>

      <SubmitButton pendingLabel="Updating…">Update application</SubmitButton>
    </form>
  );
}
