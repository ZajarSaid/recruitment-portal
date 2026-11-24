"use client";

import { useState } from "react";
import { notifyAction } from "@/components/action-feedback";

export function UploadForm() {
  const [result, setResult] = useState<string>();
  const [pending, setPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult(undefined);
    setPending(true);
    try {
      const formData = new FormData(e.currentTarget as HTMLFormElement);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        const message = data.error ?? "Upload failed.";
        notifyAction(message, false);
        return;
      }
      setResult(data.url);
      notifyAction("File uploaded.", true);
    } catch {
      notifyAction("Upload failed.", false);
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input type="file" name="file" required className="block w-full min-w-0" />
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Uploading…" : "Upload"}
      </button>
      {result && (
        <p className="text-sm">
          <a href={result} target="_blank" rel="noreferrer" className="underline">
            View file
          </a>
        </p>
      )}
    </form>
  );
}
