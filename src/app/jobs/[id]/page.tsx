import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge, Card } from "@/components/ui";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { formatDate, formatDateTime, SALARY_LABEL } from "@/lib/format";
import { canManageJob, getJobAvailability, getPublicJob } from "@/lib/jobs";
import { listJobRequirements, requirementLabel } from "@/lib/job-documents";

type JobPageProps = PageProps<"/jobs/[id]">;

export async function generateMetadata({
  params,
}: JobPageProps): Promise<Metadata> {
  const { id } = await params;
  const job = await getPublicJob(id);
  if (!job) {
    return { title: "Job vacancy not found" };
  }
  return {
    title: job.title,
    description: `${job.title} in the ${job.department} department, based in ${job.location}. Applications close on ${formatDate(job.closesAt)}.`,
  };
}

const availabilityInfo: Record<
  string,
  { tone: string; label: string; note: string }
> = {
  OPEN: {
    tone: "green",
    label: "Applications open",
    note: "This vacancy is within its application period.",
  },
  UPCOMING: {
    tone: "amber",
    label: "Opening soon",
    note: "The application window has not opened yet.",
  },
  CLOSED: {
    tone: "neutral",
    label: "Closed",
    note: "This vacancy is no longer accepting applications.",
  },
};

export default async function JobDetailPage({ params }: JobPageProps) {
  const { id } = await params;
  const job = await getPublicJob(id);
  if (!job) {
    notFound();
  }

  const user = await getCurrentUser();
  const availability = getJobAvailability(job);
  const info = availabilityInfo[availability];
  const requirements = await listJobRequirements(job.id);

  const application =
    user?.role === "CANDIDATE"
      ? await prisma.application.findUnique({
          where: { candidateId_jobId: { candidateId: user.id, jobId: job.id } },
          select: { id: true },
        })
      : null;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Link
        href="/jobs"
        className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
      >
        ← Back to vacancies
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {job.title}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {job.department} · {job.location}
          </p>
        </div>
        <Badge tone={info.tone}>{info.label}</Badge>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Salary
          </p>
          <p className="mt-1 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
            {SALARY_LABEL}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Application period
          </p>
          <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {formatDate(job.opensAt)} — {formatDate(job.closesAt)}
          </p>
        </Card>
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Job description
        </h2>
        <p className="mt-2 whitespace-pre-line text-sm leading-6 text-zinc-700 dark:text-zinc-300">
          {job.description}
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Required qualifications
        </h2>
        <p className="mt-2 whitespace-pre-line text-sm leading-6 text-zinc-700 dark:text-zinc-300">
          {job.qualifications}
        </p>
      </section>

      {requirements.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Documents required for this vacancy
          </h2>
          <ul className="mt-2 space-y-2">
            {requirements.map((requirement) => (
              <li
                key={requirement.id}
                className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-zinc-200 p-3 dark:border-zinc-800"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {requirementLabel(requirement)}
                  </p>
                  {requirement.description && (
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                      {requirement.description}
                    </p>
                  )}
                </div>
                <Badge
                  tone={
                    requirement.requirementStatus === "REQUIRED"
                      ? "red"
                      : "neutral"
                  }
                >
                  {requirement.requirementStatus === "REQUIRED"
                    ? "Required"
                    : "Optional"}
                </Badge>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          How to apply
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
          {info.note}
        </p>

        <div className="mt-4">
          {user?.role === "CANDIDATE" && application && (
            <div className="space-y-2">
              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                You have already applied for this vacancy.
              </p>
              <Link
                href={`/applications/${application.id}`}
                className="inline-flex rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                View application status
              </Link>
            </div>
          )}

          {availability === "OPEN" &&
            user?.role === "CANDIDATE" &&
            !application && (
              <Link
                href={`/jobs/${job.id}/apply`}
                className="inline-flex rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Apply for this job
              </Link>
            )}

          {availability === "OPEN" && !user && (
            <Link
              href={`/login?next=/jobs/${job.id}`}
              className="inline-flex rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Log in to apply
            </Link>
          )}

          {availability === "OPEN" && user && user.role !== "CANDIDATE" && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Only candidate accounts can submit applications.
            </p>
          )}

          {availability !== "OPEN" && !application && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Applications are not being accepted for this vacancy.
            </p>
          )}
        </div>

        {user && canManageJob(user, job) && (
          <p className="mt-4 border-t border-zinc-200 pt-4 text-sm dark:border-zinc-800">
            <Link
              href={`/recruiter/jobs/${job.id}`}
              className="font-medium text-zinc-900 underline dark:text-zinc-100"
            >
              Manage this vacancy
            </Link>
          </p>
        )}
      </section>

      <p className="mt-6 text-xs text-zinc-500 dark:text-zinc-400">
        Published {formatDateTime(job.createdAt)} · Last updated{" "}
        {formatDateTime(job.updatedAt)}
      </p>
    </main>
  );
}
