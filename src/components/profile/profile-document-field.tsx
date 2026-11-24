"use client";

import { confirmAction, notifyAction } from "@/components/action-feedback";

import { useId, useState, useTransition } from "react";

import { Badge } from "@/components/ui";
import { formatFileSize } from "@/lib/document-files";
import {
  removeProfileDocumentAction,
  uploadProfileDocumentAction,
} from "@/lib/actions/profile";
import type { CategoryDocumentSpec } from "@/lib/profile-documents";

export type ProfileDocumentInfo = {
  id: string;
  documentKey: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  url: string | null;
};

type UploadStatus = "idle" | "uploading" | "removing";

export function ProfileDocumentField({
  document: spec,
  initial,
  accept,
  canUpload,
  onChange,
  compact = false,
}: {
  document: CategoryDocumentSpec;
  initial: ProfileDocumentInfo | null;
  accept: string;
  canUpload: boolean;
  compact?: boolean;
  onChange?: (
    documentKey: string,
    document: ProfileDocumentInfo | null,
    uploading: boolean,
  ) => void;
}) {
  const inputId = useId();
  const [document, setDocument] = useState<ProfileDocumentInfo | null>(initial);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [pending, startTransition] = useTransition();

  const busy = pending || status === "uploading" || status === "removing";

  function handleFile(file: File) {
    const formData = new FormData();
    formData.set("documentKey", spec.key);
    formData.set("file", file);

    setStatus("uploading");
    onChange?.(spec.key, document, true);

    startTransition(async () => {
      const result = await uploadProfileDocumentAction(
        undefined,
        formData,
      ).catch(() => undefined);
      if (result?.ok && result.document) {
        setDocument(result.document);
        setStatus("idle");
        notifyAction("Uploaded.", true);
        onChange?.(spec.key, result.document, false);
      } else {
        setStatus("idle");
        notifyAction(
          result?.message ?? "Upload failed. Please try again.",
          false,
        );
        onChange?.(spec.key, document, false);
      }
    });
  }

  function handleRemove() {
    const formData = new FormData();
    formData.set("documentKey", spec.key);

    setStatus("removing");
    onChange?.(spec.key, document, true);

    startTransition(async () => {
      const result = await removeProfileDocumentAction(
        undefined,
        formData,
      ).catch(() => undefined);
      if (result?.ok) {
        setDocument(null);
        setStatus("idle");
        onChange?.(spec.key, null, false);
        notifyAction("Document removed.", true);
      } else {
        setStatus("idle");
        notifyAction(result?.message ?? "Could not remove the file.", false);
        onChange?.(spec.key, document, false);
      }
    });
  }

  return (
    <div className={`grid items-center gap-3 py-3 ${compact ? "min-w-0" : "px-4 sm:grid-cols-[minmax(0,1fr)_auto]"}`}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {spec.label}
            </p>
            {spec.description && (
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                {spec.description}
              </p>
            )}
          </div>
          <Badge
            tone={document ? "green" : spec.required ? "amber" : "neutral"}
          >
            {document ? "Uploaded" : spec.required ? "Missing" : "Optional"}
          </Badge>
        </div>
        {document && (
          <p className="mt-1 wrap-anywhere text-xs text-zinc-500 dark:text-zinc-400">
            {document.originalFileName} · {formatFileSize(document.fileSize)}
          </p>
        )}
      </div>

      <div className={`flex flex-wrap items-center gap-x-3 gap-y-2 ${compact ? "" : "sm:justify-end"}`}>
        {document && (
          <>
            <a
              href={`/profile/documents/${encodeURIComponent(document.id)}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`View ${spec.label} (opens in a new tab)`}
              className="text-sm font-medium text-indigo-700 hover:underline dark:text-indigo-300"
            >
              View
            </a>
            <button
              type="button"
              onClick={() =>
                confirmAction(
                  "Remove this profile document?",
                  "Remove document",
                  handleRemove,
                )
              }
              disabled={busy}
              aria-label={`Remove ${spec.label}`}
              className="text-sm font-medium text-red-600 hover:underline disabled:opacity-60 dark:text-red-400"
            >
              Remove
            </button>
          </>
        )}

        <input
          id={inputId}
          type="file"
          accept={accept}
          disabled={busy || !canUpload}
          aria-label={`${document ? "Replace" : "Upload"} ${spec.label}`}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) handleFile(file);
          }}
          className="peer sr-only"
        />
        <label
          htmlFor={inputId}
          className="inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-50 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-disabled:cursor-default peer-disabled:opacity-50 dark:border-indigo-900 dark:bg-zinc-950 dark:text-indigo-300 dark:hover:bg-indigo-950"
        >
          {document ? "Replace file" : "Choose file"}
        </label>
      </div>

      {busy && (
        <p
          role="status"
          className="text-xs text-zinc-500 sm:col-span-2 dark:text-zinc-400"
        >
          {status === "removing" ? "Removing…" : "Uploading…"}
        </p>
      )}
    </div>
  );
}
