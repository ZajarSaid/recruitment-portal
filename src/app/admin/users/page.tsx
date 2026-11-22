import type { Metadata } from "next";

import { EmptyState } from "@/components/ui";
import { UserManagementRow } from "@/components/admin/user-management-row";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "Users and roles",
  robots: { index: false, follow: false },
};

export default async function AdminUsersPage() {
  const current = await requireRole("ADMIN");

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });
  const staff = users.filter((user) => user.role !== "CANDIDATE");
  const candidates = users.filter((user) => user.role === "CANDIDATE");

  function renderUser(user: (typeof users)[number]) {
    return (
      <UserManagementRow
        key={user.id}
        isSelf={user.id === current.id}
        user={{ ...user, createdAtLabel: formatDate(user.createdAt) }}
      />
    );
  }

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Users and roles
      </h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
        Manage staff roles and account access.
      </p>

      <div className="mt-6 space-y-3">
        {staff.length === 0 ? (
          <EmptyState title="No staff accounts found" />
        ) : (
          staff.map(renderUser)
        )}
      </div>
      {candidates.length > 0 && (
        <details className="mt-6 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <summary className="cursor-pointer text-sm font-semibold">
            Candidate account access
          </summary>
          <div className="mt-3 space-y-3">{candidates.map(renderUser)}</div>
        </details>
      )}
    </div>
  );
}
