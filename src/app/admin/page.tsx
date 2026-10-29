import type { Metadata } from "next";
import Link from "next/link";

import { Card, StatCard } from "@/components/ui";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "Admin dashboard",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  await requireRole("ADMIN");

  const [usersByRole, jobsByStatus, applicationsByStatus] = await Promise.all([
    prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
    prisma.job.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.application.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const roleCount = Object.fromEntries(
    usersByRole.map((row) => [row.role, row._count._all]),
  ) as Record<string, number>;
  const jobCount = Object.fromEntries(
    jobsByStatus.map((row) => [row.status, row._count._all]),
  ) as Record<string, number>;
  const appCount = Object.fromEntries(
    applicationsByStatus.map((row) => [row.status, row._count._all]),
  ) as Record<string, number>;

  const totalUsers = usersByRole.reduce((sum, row) => sum + row._count._all, 0);
  const totalJobs = jobsByStatus.reduce((sum, row) => sum + row._count._all, 0);
  const totalApplications = applicationsByStatus.reduce(
    (sum, row) => sum + row._count._all,
    0,
  );

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Administrator dashboard
      </h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
        Overview of the recruitment portal.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Users" value={totalUsers} />
        <StatCard label="Published vacancies" value={jobCount.PUBLISHED ?? 0} />
        <StatCard
          label="Submitted applications"
          value={appCount.SUBMITTED ?? 0}
        />
        <StatCard
          label="Shortlisted candidates"
          value={appCount.SHORTLISTED ?? 0}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total vacancies" value={totalJobs} />
        <StatCard label="Draft vacancies" value={jobCount.DRAFT ?? 0} />
        <StatCard label="Closed vacancies" value={jobCount.CLOSED ?? 0} />
        <StatCard label="Rejected applications" value={appCount.REJECTED ?? 0} />
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        <Card>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Users by role
          </h2>
          <ul className="mt-3 space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
            <li className="flex justify-between">
              <span>Candidates</span>
              <span>{roleCount.CANDIDATE ?? 0}</span>
            </li>
            <li className="flex justify-between">
              <span>Recruiters</span>
              <span>{roleCount.RECRUITER ?? 0}</span>
            </li>
            <li className="flex justify-between">
              <span>Administrators</span>
              <span>{roleCount.ADMIN ?? 0}</span>
            </li>
          </ul>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Applications by status
          </h2>
          <ul className="mt-3 space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
            <li className="flex justify-between">
              <span>Submitted</span>
              <span>{appCount.SUBMITTED ?? 0}</span>
            </li>
            <li className="flex justify-between">
              <span>Under review</span>
              <span>{appCount.UNDER_REVIEW ?? 0}</span>
            </li>
            <li className="flex justify-between">
              <span>Shortlisted</span>
              <span>{appCount.SHORTLISTED ?? 0}</span>
            </li>
            <li className="flex justify-between">
              <span>Rejected</span>
              <span>{appCount.REJECTED ?? 0}</span>
            </li>
          </ul>
          {totalApplications === 0 && (
            <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
              No applications have been submitted yet.
            </p>
          )}
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Quick actions
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link
                href="/admin/users"
                className="text-indigo-600 hover:underline dark:text-indigo-400"
              >
                Manage users and roles →
              </Link>
            </li>
            <li>
              <Link
                href="/admin/jobs"
                className="text-indigo-600 hover:underline dark:text-indigo-400"
              >
                Oversee job vacancies →
              </Link>
            </li>
            <li>
              <Link
                href="/admin/applications"
                className="text-indigo-600 hover:underline dark:text-indigo-400"
              >
                Oversee applications →
              </Link>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
