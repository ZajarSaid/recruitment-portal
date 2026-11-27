"use client";

import { useState, type ComponentProps } from "react";

import { TextInput } from "@/components/ui";

export function PasswordInput({
  id,
  toggleLabel = "password",
  ...props
}: Omit<ComponentProps<typeof TextInput>, "type"> & { id: string; toggleLabel?: string }) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <TextInput {...props} id={id} type={showPassword ? "text" : "password"} />
      <button
        type="button"
        aria-controls={id}
        aria-label={showPassword ? "Hide " + toggleLabel : "Show " + toggleLabel}
        onClick={() => setShowPassword((visible) => !visible)}
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-zinc-300 text-indigo-700 hover:bg-indigo-50 dark:border-zinc-700 dark:text-indigo-300 dark:hover:bg-indigo-950"
      >
        <svg
          aria-hidden="true"
          className="size-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {showPassword ? (
            <>
              <path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8" />
              <path d="M9.5 5.4A10.4 10.4 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3 3.7M6.2 6.2C3.6 8 2 12 2 12s4 7 10 7a10 10 0 0 0 5-1.5" />
            </>
          ) : (
            <>
              <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </>
          )}
        </svg>
      </button>
    </div>
  );
}
