"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/submit-button";
import { Alert, Select } from "@/components/ui";
import { setUserActiveAction, updateUserRoleAction } from "@/lib/actions/admin";
import { ROLES, ROLE_LABELS } from "@/lib/roles";

export function UserManagementRow({
  user,
  isSelf,
}: {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
    createdAtLabel: string;
  };
  isSelf: boolean;
}) {
  const [roleState, roleAction] = useActionState(updateUserRoleAction, undefined);
  const [activeState, activeAction] = useActionState(
    setUserActiveAction,
    undefined,
  );

  return (
    <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium text-zinc-900 dark:text-zinc-50">
            {user.name}
            {isSelf && (
              <span className="ml-2 text-xs font-normal text-zinc-500">
                (you)
              </span>
            )}
          </p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {user.email}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Joined {user.createdAtLabel} ·{" "}
            <span
              className={
                user.isActive
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              }
            >
              {user.isActive ? "Active" : "Deactivated"}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <form action={roleAction} className="flex items-end gap-2">
            <input type="hidden" name="userId" value={user.id} />
            <label className="text-xs text-zinc-500 dark:text-zinc-400">
              <span className="mb-1 block font-medium">Role</span>
              <Select
                name="role"
                defaultValue={user.role}
                disabled={isSelf}
                aria-label={`Role for ${user.name}`}
              >
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </Select>
            </label>
            <SubmitButton
              pendingLabel="Saving…"
              disabled={isSelf}
              className="px-3 py-2"
            >
              Save
            </SubmitButton>
          </form>

          <form action={activeAction} className="pb-0.5">
            <input type="hidden" name="userId" value={user.id} />
            <input
              type="hidden"
              name="isActive"
              value={(!user.isActive).toString()}
            />
            <SubmitButton
              pendingLabel="Updating…"
              disabled={isSelf}
              className={
                user.isActive
                  ? "bg-red-700 hover:bg-red-600 dark:bg-red-600 dark:text-white dark:hover:bg-red-500"
                  : "bg-emerald-700 hover:bg-emerald-600 dark:bg-emerald-600 dark:text-white dark:hover:bg-emerald-500"
              }
            >
              {user.isActive ? "Deactivate" : "Activate"}
            </SubmitButton>
          </form>
        </div>
      </div>

      {(roleState?.message || activeState?.message) && (
        <div className="mt-3 space-y-2">
          {roleState?.message && (
            <Alert tone={roleState.ok ? "success" : "error"}>
              {roleState.message}
            </Alert>
          )}
          {activeState?.message && (
            <Alert tone={activeState.ok ? "success" : "error"}>
              {activeState.message}
            </Alert>
          )}
        </div>
      )}
    </div>
  );
}
