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

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Users and roles
      </h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
        Change user roles or activate and deactivate accounts. Deactivated users
        are blocked immediately on their next request.
      </p>

      <div className="mt-6 space-y-3">
        {users.length === 0 ? (
          <EmptyState title="No users found" />
        ) : (
          users.map((user) => (
            <UserManagementRow
              key={user.id}
              isSelf={user.id === current.id}
              user={{
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                isActive: user.isActive,
                createdAtLabel: formatDate(user.createdAt),
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}
