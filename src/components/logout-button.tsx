"use client";

import { useId, useRef } from "react";

import { SubmitButton } from "@/components/submit-button";
import { logoutAction } from "@/lib/actions/auth";

export function LogoutButton({ className }: { className: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  return (
    <>
      <button type="button" className={className} onClick={() => dialog.current?.showModal()}>
        Sign out
      </button>
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        className="m-auto w-[calc(100%_-_2rem)] max-w-sm rounded-2xl border border-zinc-200 bg-white p-5 text-zinc-950 shadow-xl backdrop:bg-zinc-950/55 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
      >
        <h2 id={titleId} className="text-lg font-semibold">
          Are you sure you want to log out?
        </h2>
        <form action={logoutAction} className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            className="min-h-11 rounded-lg border border-zinc-300 px-4 text-sm font-semibold dark:border-zinc-700"
          >
            Cancel
          </button>
          <SubmitButton pendingLabel="Signing out…">Log out</SubmitButton>
        </form>
      </dialog>
    </>
  );
}
