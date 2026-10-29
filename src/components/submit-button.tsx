"use client";

import type { ButtonHTMLAttributes } from "react";
import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  pendingLabel,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || props.disabled}
      className={`inline-flex items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 ${className}`}
      {...props}
    >
      {pending ? (pendingLabel ?? "Please wait…") : children}
    </button>
  );
}
