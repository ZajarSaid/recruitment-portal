import type { Metadata } from "next";
import Link from "next/link";

import { Badge, Card, EmptyState } from "@/components/ui";
import { AssignRecruiterForm } from "@/components/admin/assign-recruiter-form";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { formatDate, humanizeStatus } from "@/lib/format";

export const metadata: Metadata = {
  title: "Jobs oversight",
  robots: { index: false, follow: false },
};

const statusTone: Record<string, string> = {
  DRAFT: "neutral",
  PUBLISHED: "green",
  CLOSED: "red",
};

export default async function AdminJobsPage() {
  await requireRole("ADMIN");

  const jobs = await prisma.job.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      _count: {
        select: { applications: true, documentRequirements: true },
      },
      createdBy: { select: { name: true } },
      recruiter: { select: { name: true, email: true } },
    },
  });

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Job oversight
      </h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
        Review all vacancies and assign a recruiter to manage each one.
      </p>

      <div className="mt-6 space-y-4">
        {jobs.length === 0 ? (
          <EmptyState title="No vacancies found" />
        ) : (
          jobs.map((job) => (
            <Card key={job.id}>
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
                    Closes {formatDate(job.closesAt)} · Created by{" "}
                    {job.createdBy.name} · {job._count.applications}{" "}
                    {job._count.applications === 1
                      ? "application"
                      : "applications"}
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
                      View applications
                    </Link>
                  )}
                </div>
              </div>

              <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
                <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
                  Currently assigned recruiter:{" "}
                  {job.recruiter
                    ? `${job.recruiter.name} (${job.recruiter.email})`
                    : "None"}
                </p>
                <AssignRecruiterForm
                  jobId={job.id}
                  currentEmail={job.recruiter?.email ?? null}
                />
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
