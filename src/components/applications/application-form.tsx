"use client";

import { useActionState, useState } from "react";

import { SubmitButton } from "@/components/submit-button";
import { Alert, Field, TextArea } from "@/components/ui";
import { applyToJobAction } from "@/lib/actions/applications";
import type { StagedDocumentInfo } from "@/lib/actions/documents";
import {
  DocumentUploadField,
  type RequirementSummary,
} from "@/components/applications/document-upload-field";
import { ProfilePhotoField } from "@/components/applications/profile-photo-field";

export function ApplicationForm({
  jobId,
  requirements,
  initialDocuments,
  accept,
  maxBytes,
  initialPhoto,
}: {
  jobId: string;
  requirements: RequirementSummary[];
  initialDocuments: StagedDocumentInfo[];
  accept: string;
  maxBytes: number;
  initialPhoto?: { url: string | null; publicId: string } | null;
}) {
  const [state, action] = useActionState(applyToJobAction, undefined);

  const [documents, setDocuments] = useState<
    Record<string, StagedDocumentInfo | null>
  >(() => {
    const map: Record<string, StagedDocumentInfo | null> = {};
    for (const requirement of requirements) map[requirement.id] = null;
    for (const document of initialDocuments) {
      if (document.requirementId in map) map[document.requirementId] = document;
    }
    return map;
  });
  const [uploading, setUploading] = useState<Record<string, boolean>>({});

  function handleChange(
    requirementId: string,
    document: StagedDocumentInfo | null,
    isUploading: boolean,
  ) {
    setDocuments((previous) => ({ ...previous, [requirementId]: document }));
    setUploading((previous) => ({ ...previous, [requirementId]: isUploading }));
  }

  const requiredRequirements = requirements.filter(
    (requirement) => requirement.requirementStatus === "REQUIRED",
  );
  const optionalRequirements = requirements.filter(
    (requirement) => requirement.requirementStatus === "OPTIONAL",
  );
  const missingRequired = requiredRequirements.filter(
    (requirement) => !documents[requirement.id],
  );
  const anyUploading = Object.values(uploading).some(Boolean);
  const canSubmit = missingRequired.length === 0 && !anyUploading;

  const renderField = (requirement: RequirementSummary) => (
    <DocumentUploadField
      key={requirement.id}
      jobId={jobId}
      requirement={requirement}
      initial={documents[requirement.id] ?? null}
      accept={accept}
      maxBytes={maxBytes}
      onChange={handleChange}
    />
  );

  return (
    <form action={action} className="space-y-4" noValidate>
      {state?.message && <Alert tone="error">{state.message}</Alert>}
      <input type="hidden" name="jobId" value={jobId} />

      <Field
        label="Resume summary / professional summary"
        htmlFor="resumeSummary"
        error={state?.errors?.resumeSummary}
        hint="Summarize your education, experience, skills, and key achievements relevant to this role."
      >
        <TextArea
          id="resumeSummary"
          name="resumeSummary"
          rows={8}
          required
          placeholder="Provide a clear, professional summary of your qualifications."
        />
      </Field>

      <ProfilePhotoField initial={initialPhoto} maxBytes={maxBytes} />

      {requiredRequirements.length > 0 && (
        <div className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Required attachments
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Upload each required attachment. You can replace or remove files
              before submitting.
            </p>
          </div>

          {requiredRequirements.map(renderField)}

          {missingRequired.length > 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Still required:{" "}
              {missingRequired.map((requirement) => requirement.label).join(", ")}
            </p>
          )}
        </div>
      )}

      {optionalRequirements.length > 0 && (
        <div className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Optional documents
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              These documents are not required, but you may attach them if you
              have them.
            </p>
          </div>

          {optionalRequirements.map(renderField)}
        </div>
      )}

      <SubmitButton pendingLabel="Submitting application…" disabled={!canSubmit}>
        Submit application
      </SubmitButton>
    </form>
  );
}
