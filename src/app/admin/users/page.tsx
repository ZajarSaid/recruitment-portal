import type { Metadata } from "next";

import { EmptyState } from "@/components/ui";
import { CreateStaffForm } from "@/components/admin/create-staff-form";
import { UserManagementRow } from "@/components/admin/user-management-row";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { STAFF_ROLES } from "@/lib/roles";

export const metadata: Metadata = {
  title: "Users and roles",
  robots: { index: false, follow: false },
};

export default async function AdminUsersPage() {
  const current = await requireRole("ADMIN");

  const users = await prisma.user.findMany({
    where: { role: { in: [...STAFF_ROLES] } },
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

      <section className="mt-6 space-y-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="font-semibold">Add staff account</h2>
        <CreateStaffForm />
      </section>
      <div className="mt-6 space-y-3">
        {users.length === 0 ? (
          <EmptyState title="No staff accounts found" />
        ) : (
          users.map(renderUser)
        )}
      </div>
    </div>
  );
}
