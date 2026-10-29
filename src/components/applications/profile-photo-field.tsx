"use client";

import { useId, useRef, useState, useTransition } from "react";

import { formatFileSize } from "@/lib/document-files";
import { uploadProfilePhotoAction } from "@/lib/actions/profile-photo";

export type ProfilePhotoValue = {
  url: string | null;
  publicId: string;
};

const IMAGE_ACCEPT = ".jpg,.jpeg,.png";

export function ProfilePhotoField({
  initial,
  maxBytes,
}: {
  initial?: ProfilePhotoValue | null;
  maxBytes: number;
}) {
  const inputId = useId();
  const [photo, setPhoto] = useState<ProfilePhotoValue | null>(initial ?? null);
  const [preview, setPreview] = useState<string | null>(initial?.url ?? null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();
  const localPreview = useRef<string | null>(null);

  function handleFile(file: File) {
    setMessage(null);
    setError(false);

    if (localPreview.current) URL.revokeObjectURL(localPreview.current);
    const objectUrl = URL.createObjectURL(file);
    localPreview.current = objectUrl;
    setPreview(objectUrl);

    const formData = new FormData();
    formData.set("file", file);

    startTransition(async () => {
      const result = await uploadProfilePhotoAction(undefined, formData);
      if (result && result.ok) {
        setPhoto({ url: result.url, publicId: result.publicId });
        setPreview(result.url ?? objectUrl);
        setMessage("Photo uploaded.");
      } else {
        setError(true);
        setMessage(result?.message ?? "Upload failed. Please try again.");
        setPreview(initial?.url ?? null);
        setPhoto(initial ?? null);
      }
    });
  }

  function handleRemove() {
    if (localPreview.current) {
      URL.revokeObjectURL(localPreview.current);
      localPreview.current = null;
    }
    setPhoto(null);
    setPreview(null);
    setMessage(null);
    setError(false);
  }

  return (
    <div className="rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Profile photograph
          </p>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            A recent passport-size photograph. Optional, but recommended.
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4">
        {preview ? (
          // Object/CDN URL previews are not run through next/image on purpose.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Profile photo preview"
            className="h-20 w-20 rounded-full border border-zinc-200 object-cover dark:border-zinc-700"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full border border-dashed border-zinc-300 text-xs text-zinc-400 dark:border-zinc-700">
            No photo
          </div>
        )}

        <div className="flex flex-col gap-2">
          <input
            id={inputId}
            type="file"
            accept={IMAGE_ACCEPT}
            disabled={pending}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) handleFile(file);
            }}
            className="block w-full text-sm text-zinc-700 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-900 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-zinc-700 disabled:opacity-60 dark:text-zinc-300 dark:file:bg-zinc-50 dark:file:text-zinc-900"
          />
          {photo && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={pending}
              className="self-start text-sm font-medium text-red-600 hover:underline disabled:opacity-60 dark:text-red-400"
            >
              Remove photo
            </button>
          )}
        </div>
      </div>

      {pending && (
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          Uploading…
        </p>
      )}
      {!pending && message && (
        <p
          className={`mt-2 text-xs ${
            error
              ? "text-red-600 dark:text-red-400"
              : "text-emerald-600 dark:text-emerald-400"
          }`}
        >
          {message}
        </p>
      )}
      <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
        JPEG or PNG up to {formatFileSize(maxBytes)}.
      </p>

      <input type="hidden" name="photoUrl" value={photo?.url ?? ""} />
      <input type="hidden" name="photoPublicId" value={photo?.publicId ?? ""} />
    </div>
  );
}
