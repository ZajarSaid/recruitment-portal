"use client";

import type { ButtonHTMLAttributes } from "react";
import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  pendingLabel,
  className = "",
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={`inline-flex min-h-11 items-center justify-center rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-indigo-400 dark:text-indigo-950 dark:hover:bg-indigo-300 ${className}`}
      {...props}
    >
      {pending ? (pendingLabel ?? "Please wait…") : children}
    </button>
  );
}
