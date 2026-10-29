import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { JobStatusControls } from "@/components/jobs/job-status-controls";
import { Badge, Card } from "@/components/ui";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/db";
import {
  formatDate,
  formatDateTime,
  humanizeStatus,
  SALARY_LABEL,
} from "@/lib/format";
import { listJobRequirements } from "@/lib/job-documents";
import { getManagedJob } from "@/lib/jobs";

export const metadata: Metadata = {
  title: "Vacancy details",
  robots: { index: false, follow: false },
};

const statusTone: Record<string, string> = {
  DRAFT: "neutral",
  PUBLISHED: "green",
  CLOSED: "red",
};

export default async function ManageJobDetailPage({
  params,
}: PageProps<"/recruiter/jobs/[id]">) {
  const user = await requireRole("RECRUITER", "ADMIN");
  const { id } = await params;

  const job = await getManagedJob(id, user);
  if (!job) {
    notFound();
  }

  const applicationCount = await prisma.application.count({
    where: { jobId: job.id },
  });

  const requirements = await listJobRequirements(job.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/recruiter/jobs"
            className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
          >
            ← Back to vacancies
          </Link>
          <h1 className="mt-2 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {job.title}
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            {job.department} · {job.location}
          </p>
        </div>
        <Badge tone={statusTone[job.status] ?? "neutral"}>
          {humanizeStatus(job.status)}
        </Badge>
      </div>

      <Card>
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Vacancy status
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
          Only published vacancies within their application window are visible
          and reopen to candidates.
        </p>
        <div className="mt-4">
          <JobStatusControls jobId={job.id} status={job.status} />
        </div>
      </Card>

      <Card>
        <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          <Detail label="Applications">
            {applicationCount}
          </Detail>
          <Detail label="Salary">{SALARY_LABEL}</Detail>
          <Detail label="Applications open">{formatDate(job.opensAt)}</Detail>
          <Detail label="Applications close">{formatDate(job.closesAt)}</Detail>
          <Detail label="Created">{formatDateTime(job.createdAt)}</Detail>
          <Detail label="Last updated">{formatDateTime(job.updatedAt)}</Detail>
        </dl>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Description
        </h2>
        <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
          {job.description}
        </p>

        <h2 className="mt-6 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Qualifications and requirements
        </h2>
        <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
          {job.qualifications}
        </p>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Document requirements
          </h2>
          <Link
            href={`/recruiter/jobs/${job.id}/edit`}
            className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
          >
            Configure →
          </Link>
        </div>

        {requirements.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
            No document requirements. Applicants submit only the text summary.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {requirements.map((requirement) => (
              <li
                key={requirement.id}
                className="flex flex-wrap items-start justify-between gap-2 border-b border-zinc-100 pb-2 last:border-0 last:pb-0 dark:border-zinc-900"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {requirement.documentType?.name ??
                      requirement.customName ??
                      "Document"}
                  </p>
                  {requirement.description && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {requirement.description}
                    </p>
                  )}
                </div>
                <Badge
                  tone={
                    requirement.requirementStatus === "REQUIRED"
                      ? "red"
                      : "amber"
                  }
                >
                  {requirement.requirementStatus === "REQUIRED"
                    ? "Required"
                    : "Optional"}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="flex flex-wrap gap-4">
        <Link
          href={`/recruiter/jobs/${job.id}/applications`}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
        >
          Review applications ({applicationCount})
        </Link>
        <Link
          href={`/recruiter/jobs/${job.id}/edit`}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Edit vacancy
        </Link>
        {job.status === "PUBLISHED" && (
          <Link
            href={`/jobs/${job.id}`}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            View public page
          </Link>
        )}
      </div>
    </div>
  );
}

function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">
        {children}
      </dd>
    </div>
  );
}
