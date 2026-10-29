import type { Metadata } from "next";
import Link from "next/link";

import { Badge, Card, EmptyState } from "@/components/ui";
import { requireRole } from "@/lib/dal";
import { formatDate, humanizeStatus } from "@/lib/format";
import { listManagedJobs } from "@/lib/jobs";

export const metadata: Metadata = {
  title: "Manage vacancies",
  robots: { index: false, follow: false },
};

const statusTone: Record<string, string> = {
  DRAFT: "neutral",
  PUBLISHED: "green",
  CLOSED: "red",
};

export default async function ManageJobsPage() {
  const user = await requireRole("RECRUITER", "ADMIN");
  const jobs = await listManagedJobs(user);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Job vacancies
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            {user.role === "ADMIN"
              ? "All vacancies in the portal."
              : "Vacancies you created or are assigned to."}
          </p>
        </div>
        <Link
          href="/recruiter/jobs/new"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          New vacancy
        </Link>
      </div>

      <div className="mt-6 space-y-3">
        {jobs.length === 0 ? (
          <EmptyState
            title="No vacancies yet"
            description="Create your first vacancy to start receiving applications."
          />
        ) : (
          jobs.map((job) => (
            <Card key={job.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link
                    href={`/recruiter/jobs/${job.id}`}
                    className="font-medium text-zinc-900 hover:underline dark:text-zinc-50"
                  >
                    {job.title}
                  </Link>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {job.department} · {job.location}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    Closes {formatDate(job.closesAt)} ·{" "}
                    {job._count.applications}{" "}
                    {job._count.applications === 1
                      ? "application"
                      : "applications"}
                    {job.recruiter
                      ? ` · Recruiter: ${job.recruiter.name}`
                      : ""}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge tone={statusTone[job.status] ?? "neutral"}>
                    {humanizeStatus(job.status)}
                  </Badge>
                  <Badge
                    tone={
                      job._count.documentRequirements > 0 ? "blue" : "neutral"
                    }
                  >
                    {job._count.documentRequirements > 0
                      ? `${job._count.documentRequirements} document${
                          job._count.documentRequirements === 1 ? "" : "s"
                        } required`
                      : "No documents"}
                  </Badge>
                  {job._count.applications > 0 && (
                    <Link
                      href={`/recruiter/jobs/${job.id}/applications`}
                      className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                    >
                      Review {job._count.applications}{" "}
                      {job._count.applications === 1
                        ? "application"
                        : "applications"}
                    </Link>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
