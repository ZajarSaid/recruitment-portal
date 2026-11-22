"use client";

import { confirmForm, useFeedbackAction } from "@/components/action-feedback";

import { SubmitButton } from "@/components/submit-button";
import { Alert } from "@/components/ui";
import { setJobStatusAction } from "@/lib/actions/jobs";

type StatusValue = "DRAFT" | "PUBLISHED" | "CLOSED";

const TRANSITIONS: Record<
  StatusValue,
  { status: StatusValue; label: string }[]
> = {
  DRAFT: [
    { status: "PUBLISHED", label: "Publish" },
    { status: "CLOSED", label: "Close" },
  ],
  PUBLISHED: [{ status: "CLOSED", label: "Close" }],
  CLOSED: [{ status: "PUBLISHED", label: "Reopen" }],
};

export function JobStatusControls({
  jobId,
  status,
}: {
  jobId: string;
  status: string;
}) {
  const [state, formAction] = useFeedbackAction(setJobStatusAction, undefined);
  const options = TRANSITIONS[status as StatusValue] ?? [];

  return (
    <div className="space-y-3">
      {state?.message && (
        <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert>
      )}

      {options.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No status changes are available.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {options.map((option) => (
            <form
              key={option.status}
              action={formAction}
              onSubmit={(event) =>
                confirmForm(
                  event,
                  `${option.label} this vacancy?`,
                  option.label,
                )
              }
            >
              <input type="hidden" name="id" value={jobId} />
              <input type="hidden" name="status" value={option.status} />
              <SubmitButton
                pendingLabel="Updating…"
                className={
                  option.status === "CLOSED"
                    ? "bg-red-700 hover:bg-red-600 dark:bg-red-600 dark:text-white dark:hover:bg-red-500"
                    : ""
                }
              >
                {option.label}
              </SubmitButton>
            </form>
          ))}
        </div>
      )}
    </div>
  );
}
