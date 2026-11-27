"use client";

import { startTransition, useActionState, useEffect, useId, useRef, useState } from "react";

import { confirmForm, notifyAction } from "@/components/action-feedback";
import { Alert, Field, Select, TextArea, TextInput } from "@/components/ui";
import { deleteCandidatePortfolioRecord, saveCandidatePortfolio } from "@/lib/actions/candidate-portfolio";
import type { ActionState } from "@/lib/definitions";

export type PortfolioRecordKind = "education" | "employment" | "skill" | "certification";
type PortfolioKind = PortfolioRecordKind | "contact" | "summary" | "academic-level";
export type PortfolioInput = {
  name: string;
  label: string;
  value?: string | number | boolean | null;
  required?: boolean;
  maxLength?: number;
  type?: "text" | "tel" | "date" | "number" | "textarea" | "checkbox";
  options?: readonly { value: string; label: string }[];
};

const buttonClass = "inline-flex min-h-11 items-center justify-center rounded-lg border border-indigo-200 px-3 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 dark:border-indigo-900 dark:text-indigo-300 dark:hover:bg-indigo-950";
const primaryClass = "inline-flex min-h-11 items-center justify-center rounded-lg bg-indigo-700 px-4 text-sm font-semibold text-white hover:bg-indigo-600 disabled:opacity-60 dark:bg-indigo-400 dark:text-indigo-950 dark:hover:bg-indigo-300";

export function PortfolioEditor({
  kind, title, label, fields, id, primary = false,
}: {
  kind: PortfolioKind;
  title: string;
  label: string;
  fields: PortfolioInput[];
  id?: string;
  primary?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useId();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
  }, [open]);

  return (
    <>
      <button type="button" className={primary ? primaryClass : buttonClass} aria-label={label === "Edit" ? title : undefined} aria-haspopup="dialog" onClick={() => setOpen(true)}>
        {label}
      </button>
      <dialog ref={dialog} aria-labelledby={heading} onClose={() => setOpen(false)}
        className="fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-2xl border border-indigo-100 bg-white p-5 text-slate-900 shadow-xl backdrop:bg-slate-950/55 sm:p-6 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100">
        <h2 id={heading} className="text-xl font-semibold tracking-tight">{title}</h2>
        {open && (
          <EditorForm kind={kind} fields={fields} id={id} close={() => dialog.current?.close()} />
        )}
      </dialog>
    </>
  );
}

function EditorForm({
  kind, fields, id, close,
}: {
  kind: PortfolioKind;
  fields: PortfolioInput[];
  id?: string;
  close: () => void;
}) {
  const fieldPrefix = useId();
  const [state, action, pending] = useActionState(async (previous: ActionState, data: FormData) => {
    const result = await saveCandidatePortfolio(previous, data);
    if (result?.ok) {
      close();
      notifyAction(result.message ?? "Profile saved.", true);
    }
    return result;
  }, undefined);

  return (
    <form action={action} className="mt-4 space-y-4" onSubmit={(event) => {
      event.preventDefault();
      if (pending) return;
      const data = new FormData(event.currentTarget);
      startTransition(() => action(data));
    }}>
      <input type="hidden" name="kind" value={kind} />
      {id && <input type="hidden" name="id" value={id} />}
      <fieldset disabled={pending} className="grid gap-4 sm:grid-cols-2">
        {fields.map(({ name, label, value, type, options, required, maxLength }) => {
          const inputId = `${fieldPrefix}-${name}`;
          const error = state?.errors?.[name];
          const defaultValue = typeof value === "boolean" ? "" : value ?? "";
          if (type === "checkbox") {
            return (
              <label key={name} className="flex min-h-11 items-center gap-2 self-end text-sm font-medium">
                <input type="checkbox" name={name} defaultChecked={Boolean(value)} className="size-4 accent-indigo-700" />
                {label}
              </label>
            );
          }
          return (
            <div key={name} className={type === "textarea" ? "sm:col-span-2" : "min-w-0"}>
              <Field label={label} htmlFor={inputId} error={error}>
                {options ? (
                  <Select id={inputId} name={name} defaultValue={defaultValue} required={required}>
                    <option value="">Select {label.toLowerCase()}</option>
                    {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </Select>
                ) : type === "textarea" ? (
                  <TextArea id={inputId} name={name} placeholder={`Enter ${label.toLowerCase()}`} defaultValue={defaultValue} maxLength={maxLength} rows={4} required={required} />
                ) : (
                  <TextInput id={inputId} name={name} placeholder={type === "date" ? undefined : `Enter ${label.toLowerCase()}`} type={type ?? "text"} defaultValue={defaultValue} maxLength={maxLength} required={required} />
                )}
              </Field>
            </div>
          );
        })}
      </fieldset>
      {!state?.ok && (state?.message || state?.errors?.form?.[0]) && (
        <div role="alert"><Alert tone="error">{state.message ?? state.errors?.form?.[0]}</Alert></div>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" className={buttonClass} disabled={pending} onClick={close}>Cancel</button>
        <button type="submit" className={primaryClass} disabled={pending}>{pending ? "Saving…" : "Save"}</button>
      </div>
    </form>
  );
}

export function RemovePortfolioRecord({
  kind, id, name, compact = false,
}: {
  kind: PortfolioRecordKind;
  id: string;
  name: string;
  compact?: boolean;
}) {
  const [state, action, pending] = useActionState(async (previous: ActionState, data: FormData) => {
    const result = await deleteCandidatePortfolioRecord(previous, data);
    if (result?.ok) notifyAction(result.message ?? "Record removed.", true);
    return result;
  }, undefined);
  return (
    <form action={action} onSubmit={(event) => confirmForm(event, `Remove “${name}” from your profile?`, "Remove")}>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <button aria-label={`Remove ${name}`} type="submit" disabled={pending}
        className="min-h-11 min-w-8 px-1.5 text-sm font-medium text-red-700 hover:underline disabled:opacity-60 dark:text-red-400">
        {pending ? "Removing…" : compact ? "×" : "Delete"}
      </button>
      {!state?.ok && state?.message && <p role="alert" className="text-xs text-red-700 dark:text-red-400">{state.message}</p>}
    </form>
  );
}
