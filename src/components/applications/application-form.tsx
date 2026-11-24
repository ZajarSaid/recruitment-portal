"use client";

import { confirmForm, useFeedbackAction } from "@/components/action-feedback";

import { useState } from "react";

import { SubmitButton } from "@/components/submit-button";
import { Field, TextArea } from "@/components/ui";
import { applyToJobAction } from "@/lib/actions/applications";
import type { StagedDocumentInfo } from "@/lib/actions/documents";
import {
  DocumentUploadField,
  type DocumentSpec,
} from "@/components/applications/document-upload-field";
import { APPLICATION_LETTER_KEY } from "@/lib/profile-documents";

const LETTER_SPEC: DocumentSpec = {
  key: APPLICATION_LETTER_KEY,
  label: "Signed application letter",
  description:
    "Scan or photograph your signed application letter for this vacancy and attach it as a PDF or image.",
  required: true,
};

export function ApplicationForm({
  jobId,
  accept,
  maxBytes,
  initialLetter,
}: {
  jobId: string;
  accept: string;
  maxBytes: number;
  initialLetter: StagedDocumentInfo | null;
}) {
  const [state, action] = useFeedbackAction(applyToJobAction, undefined);

  const [letter, setLetter] = useState<StagedDocumentInfo | null>(
    initialLetter,
  );
  const [uploading, setUploading] = useState(false);

  function handleLetterChange(
    _key: string,
    document: StagedDocumentInfo | null,
    isUploading: boolean,
  ) {
    setLetter(document);
    setUploading(isUploading);
  }

  const canSubmit = Boolean(letter) && !uploading;

  return (
    <form
      action={action}
      onSubmit={(event) =>
        confirmForm(
          event,
          "Submit this application for review?",
          "Submit application",
        )
      }
      className="space-y-4"
      noValidate
    >
      <input type="hidden" name="jobId" value={jobId} />

      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Attach your application letter
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            Upload a signed letter addressed to the recruitment team for this
            vacancy.
          </p>
        </div>

        <DocumentUploadField
          jobId={jobId}
          document={LETTER_SPEC}
          initial={letter}
          accept={accept}
          maxBytes={maxBytes}
          onChange={handleLetterChange}
        />
      </div>

      <Field
        label="Additional notes / resume summary (optional)"
        htmlFor="resumeSummary"
        error={state?.errors?.resumeSummary}
        hint="Optionally add anything about your background you want the recruiters to read for this specific vacancy."
      >
        <TextArea
          id="resumeSummary"
          name="resumeSummary"
          rows={6}
          placeholder="Optional: summarize experience, skills, and key achievements relevant to this role."
        />
      </Field>

      <SubmitButton
        pendingLabel="Submitting application…"
        disabled={!canSubmit}
      >
        Submit application
      </SubmitButton>
    </form>
  );
}
