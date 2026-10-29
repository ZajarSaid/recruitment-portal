"use client";

import { useId, useRef, useState, useTransition } from "react";

import { Badge } from "@/components/ui";
import { formatFileSize } from "@/lib/document-files";
import {
  removeStagedDocumentAction,
  uploadStagedDocumentAction,
  type StagedDocumentInfo,
} from "@/lib/actions/documents";

export type RequirementSummary = {
  id: string;
  label: string;
  description: string | null;
  requirementStatus: "REQUIRED" | "OPTIONAL";
};

type UploadStatus = "idle" | "uploading" | "error";

export function DocumentUploadField({
  jobId,
  requirement,
  initial,
  accept,
  maxBytes,
  disabled = false,
  onChange,
}: {
  jobId: string;
  requirement: RequirementSummary;
  initial: StagedDocumentInfo | null;
  accept: string;
  maxBytes: number;
  disabled?: boolean;
  onChange: (
    requirementId: string,
    document: StagedDocumentInfo | null,
    uploading: boolean,
  ) => void;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [document, setDocument] = useState<StagedDocumentInfo | null>(initial);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const required = requirement.requirementStatus === "REQUIRED";
  const busy = pending || status === "uploading";

  function handleFile(file: File) {
    const formData = new FormData();
    formData.set("jobId", jobId);
    formData.set("requirementId", requirement.id);
    formData.set("file", file);

    setStatus("uploading");
    setMessage(null);
    onChange(requirement.id, document, true);

    startTransition(async () => {
      const result = await uploadStagedDocumentAction(undefined, formData);
      if (result?.ok && result.document) {
        setDocument(result.document);
        setStatus("idle");
        setMessage("Uploaded.");
        onChange(requirement.id, result.document, false);
      } else {
        setStatus("error");
        setMessage(result?.message ?? "Upload failed. Please try again.");
        onChange(requirement.id, document, false);
      }
    });
  }

  function handleRemove() {
    const formData = new FormData();
    formData.set("jobId", jobId);
    formData.set("requirementId", requirement.id);

    setStatus("uploading");
    setMessage(null);
    onChange(requirement.id, document, true);

    startTransition(async () => {
      const result = await removeStagedDocumentAction(undefined, formData);
      if (result?.ok) {
        setDocument(null);
        setStatus("idle");
        setMessage(null);
        onChange(requirement.id, null, false);
      } else {
        setStatus("error");
        setMessage(result?.message ?? "Could not remove the file.");
        onChange(requirement.id, document, false);
      }
    });
  }

  return (
    <div className="rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {requirement.label}
          </p>
          {requirement.description && (
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              {requirement.description}
            </p>
          )}
        </div>
        <Badge tone={required ? "red" : "neutral"}>
          {required ? "Required" : "Optional"}
        </Badge>
      </div>

      <div className="mt-3">
        {document ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-zinc-700 dark:text-zinc-300">
              {document.originalFileName}{" "}
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                ({formatFileSize(document.fileSize)})
              </span>
            </span>
            <label
              htmlFor={inputId}
              className="cursor-pointer text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
            >
              Replace
            </label>
            <button
              type="button"
              onClick={handleRemove}
              disabled={busy || disabled}
              className="text-sm font-medium text-red-600 hover:underline disabled:opacity-60 dark:text-red-400"
            >
              Remove
            </button>
          </div>
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No file selected.
          </p>
        )}

        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={accept}
          disabled={busy || disabled}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) handleFile(file);
          }}
          className={
            document
              ? "hidden"
              : "mt-2 block w-full text-sm text-zinc-700 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-900 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-zinc-700 disabled:opacity-60 dark:text-zinc-300 dark:file:bg-zinc-50 dark:file:text-zinc-900"
          }
        />
      </div>

      {busy && (
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          Uploading…
        </p>
      )}
      {!busy && message && (
        <p
          className={`mt-2 text-xs ${
            status === "error"
              ? "text-red-600 dark:text-red-400"
              : "text-emerald-600 dark:text-emerald-400"
          }`}
        >
          {message}
        </p>
      )}
      <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
        PDF, JPEG, or PNG up to {formatFileSize(maxBytes)}.
      </p>
    </div>
  );
}
