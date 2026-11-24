"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type SubmitEvent,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { FEEDBACK_COOKIE, feedbackErrors, feedbackMessages } from "@/lib/feedback-messages";
import type { ActionState } from "@/lib/definitions";

type Feedback = { message: string; ok: boolean };
const FEEDBACK_EVENT = "portal-action-feedback";
const CONFIRM_EVENT = "portal-action-confirmation";
const TOAST_DURATION_MS = 1000;
type Confirmation = { message: string; label: string; run: () => void };
const confirmedForms = new WeakSet<HTMLFormElement>();

export function confirmAction(message: string, label: string, run: () => void) {
  window.dispatchEvent(
    new CustomEvent<Confirmation>(CONFIRM_EVENT, {
      detail: { message, label, run },
    }),
  );
}

export function confirmForm(
  event: SubmitEvent<HTMLFormElement>,
  message: string,
  label: string,
) {
  const form = event.currentTarget;
  if (confirmedForms.has(form)) return;
  event.preventDefault();
  const submitter = event.nativeEvent.submitter ?? undefined;
  confirmAction(message, label, () => {
    if (!form.isConnected || (submitter && !form.contains(submitter))) return;
    confirmedForms.add(form);
    try {
      form.requestSubmit(submitter);
    } finally {
      confirmedForms.delete(form);
    }
  });
}

export function notifyAction(message: string, ok: boolean) {
  window.dispatchEvent(
    new CustomEvent<Feedback>(FEEDBACK_EVENT, { detail: { message, ok } }),
  );
}

export function useFeedbackAction(
  action: (previous: ActionState, payload: FormData) => Promise<ActionState>,
  initial: ActionState,
) {
  const result = useActionState(action, initial);
  const [state] = result;
  const last = useRef(initial);

  useEffect(() => {
    if (!state || state === last.current) return;
    last.current = state;
    const firstError = Object.values(state.errors ?? {}).flat()[0];
    if (state.message || firstError)
      notifyAction(state.message ?? firstError, Boolean(state.ok));
  }, [state]);
  return result;
}

export function ToastViewport() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [items, setItems] = useState<Array<Feedback & { id: number }>>([]);
  const location = `${pathname}?${search}`;
  const [request, setRequest] = useState<
    (Confirmation & { location: string }) | null
  >(null);
  if (request && request.location !== location) setRequest(null);
  const serial = useRef(0);

  useEffect(() => {
    const timers = new Set<ReturnType<typeof setTimeout>>();
    function handle(event: Event) {
      const id = ++serial.current;
      const feedback = (event as CustomEvent<Feedback>).detail;
      setItems((previous) => [...previous.slice(-2), { ...feedback, id }]);
      const timer = setTimeout(() => {
        timers.delete(timer);
        setItems((previous) => previous.filter((item) => item.id !== id));
      }, TOAST_DURATION_MS);
      timers.add(timer);
    }
    window.addEventListener(FEEDBACK_EVENT, handle);
    return () => {
      window.removeEventListener(FEEDBACK_EVENT, handle);
      timers.forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    function handle(event: Event) {
      setRequest({ ...(event as CustomEvent<Confirmation>).detail, location });
    }
    window.addEventListener(CONFIRM_EVENT, handle);
    return () => window.removeEventListener(CONFIRM_EVENT, handle);
  }, [location]);

  useEffect(() => {
    const key = document.cookie
      .split("; ")
      .find((entry) => entry.startsWith(`${FEEDBACK_COOKIE}=`))
      ?.slice(FEEDBACK_COOKIE.length + 1);
    if (!key) return;
    document.cookie = `${FEEDBACK_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
    if (Object.hasOwn(feedbackMessages, key)) {
      notifyAction(
        feedbackMessages[key as keyof typeof feedbackMessages],
        true,
      );
    } else if (Object.hasOwn(feedbackErrors, key)) {
      notifyAction(feedbackErrors[key as keyof typeof feedbackErrors], false);
    }
  }, [pathname, search]);

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col gap-2 sm:left-auto sm:w-96">
      {request?.location === location && (
        <div
          role="alertdialog"
          aria-label="Confirm action"
          aria-describedby="toast-confirm-message"
          onKeyDown={(event) => {
            if (event.key === "Escape") setRequest(null);
          }}
          className="pointer-events-auto rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-900 shadow-lg dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
        >
          <p id="toast-confirm-message">{request.message}</p>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              autoFocus
              onClick={() => setRequest(null)}
              className="rounded-lg border border-zinc-300 px-3 py-2 font-medium dark:border-zinc-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setRequest(null);
                request.run();
              }}
              className="rounded-lg bg-indigo-700 px-3 py-2 font-semibold text-white hover:bg-indigo-800"
            >
              {request.label}
            </button>
          </div>
        </div>
      )}
      {items.map(({ id, ok, message }) => (
        <div
          key={id}
          role={ok ? "status" : "alert"}
          className="pointer-events-auto flex items-start justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-900 shadow-lg dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
        >
          <p
            className={
              ok
                ? "border-l-2 border-emerald-500 pl-3"
                : "border-l-2 border-red-500 pl-3"
            }
          >
            {message}
          </p>
          <button
            type="button"
            aria-label="Dismiss notification"
            className="shrink-0 text-zinc-500 hover:text-zinc-950 dark:hover:text-white"
            onClick={() =>
              setItems((previous) => previous.filter((item) => item.id !== id))
            }
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
