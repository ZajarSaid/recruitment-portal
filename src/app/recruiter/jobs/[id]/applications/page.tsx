import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { canManageJob } from "@/lib/jobs";
import { summarizeApplicationDocuments, resolveRequirementViews } from "@/lib/application-documents";
import { formatDate, formatDateTime, humanizeStatus } from "@/lib/format";
import { getCategoryDocumentList } from "@/lib/profile-documents";
import { Badge, Card, EmptyState } from "@/components/ui";
import { ApplicationStatusForm } from "@/components/applications/application-status-form";
import { ApplicationDocumentsReview } from "@/components/applications/application-documents-review";

export const metadata: Metadata = {
  title: "Job applications",
  robots: { index: false, follow: false },
};

export default async function RecruiterJobApplicationsPage({
  params,
}: PageProps<"/recruiter/jobs/[id]/applications">) {
  const user = await requireRole("RECRUITER", "ADMIN");
  const { id: jobId } = await params;

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job || !canManageJob(user, job)) {
    notFound();
  }

  const applications = await prisma.application.findMany({
    where: { jobId },
    orderBy: { submittedAt: "desc" },
    include: {
      candidate: {
        select: {
          id: true,
          name: true,
          email: true,
          profile: {
            select: {
              photoUrl: true,
              category: true,
              documents: { select: { id: true, documentKey: true } },
            },
          },
        },
      },
      evaluation: {
        select: { score: true, method: true, notes: true, evaluatedAt: true },
      },
      history: {
        orderBy: { createdAt: "asc" },
        include: { actor: { select: { name: true } } },
      },
      documents: {
        select: {
          id: true,
          documentKey: true,
          requirementKey: true,
          originalFileName: true,
          mimeType: true,
          fileSize: true,
          reviewStatus: true,
          reviewComment: true,
          cloudUrl: true,
        },
      },
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <Link
          href={`/recruiter/jobs/${jobId}`}
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
        >
          ← Back to vacancy
        </Link>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {job.title} — Applications ({applications.length})
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          {job.department} · {job.location}
        </p>
      </div>

      {applications.length === 0 ? (
        <EmptyState
          title="No applications yet"
          description="Applications submitted by candidates will appear here."
        />
      ) : (
        <div className="space-y-4">
          {applications.map((application) => {
            const profile = application.candidate.profile;
            const profileDocuments = profile
              ? getCategoryDocumentList(profile.category).flatMap((spec) => {
                  const document = profile.documents.find((file) => file.documentKey === spec.key);
                  return document ? [{ id: document.id, label: spec.label }] : [];
                })
              : [];
            const summary = summarizeApplicationDocuments(
              resolveRequirementViews(application),
              application.documents,
            );
            return (
              <Card key={application.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {application.photoUrl || application.candidate.profile?.photoUrl ? (
                      // Served from cloud storage; not run through next/image.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={
                          application.photoUrl ??
                          application.candidate.profile?.photoUrl ??
                          undefined
                        }
                        alt={`${application.candidate.name} profile photograph`}
                        className="h-12 w-12 rounded-full border border-zinc-200 object-cover dark:border-zinc-700"
                      />
                    ) : null}
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-zinc-50">
                        {application.candidate.name}
                      </p>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        {application.candidate.email}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Submitted {formatDateTime(application.submittedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge>{humanizeStatus(application.status)}</Badge>
                    {summary.requirements.length > 0 && (
                      <Badge
                        tone={
                          summary.missingRequired > 0
                            ? "red"
                            : summary.rejectedCount > 0
                              ? "amber"
                              : summary.pendingCount > 0
                                ? "blue"
                                : "green"
                        }
                      >
                        {summary.missingRequired > 0
                          ? `${summary.missingRequired} document(s) missing`
                          : summary.rejectedCount > 0
                            ? `${summary.rejectedCount} document(s) rejected`
                            : summary.pendingCount > 0
                              ? "Documents pending"
                              : "Documents verified"}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="mt-4">
                  <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    Resume summary
                  </h2>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
                    {application.resumeSummary}
                  </p>
                </div>

                {application.evaluation && (
                  <div className="mt-4 rounded-md border border-zinc-200 p-3 text-sm dark:border-zinc-800">
                    <p>
                      <span className="font-medium">
                        Resume quality score:
                      </span>{" "}
                      {application.evaluation.score}/10
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Simulated deterministic assessment ({application.evaluation.method}) ·{" "}
                      {formatDate(application.evaluation.evaluatedAt)}
                    </p>
                    {application.evaluation.notes && (
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        {application.evaluation.notes}
                      </p>
                    )}
                  </div>
                )}

                <ApplicationDocumentsReview
                  applicationId={application.id}
                  items={summary.requirements}
                  extra={summary.extra}
                  requiredCount={summary.requiredCount}
                  requiredSubmitted={summary.requiredSubmitted}
                  missingRequired={summary.missingRequired}
                  photoUrl={
                    application.photoUrl ??
                    application.candidate.profile?.photoUrl
                  }
                />

                {profileDocuments.length > 0 && (
                  <details className="mt-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
                    <summary className="cursor-pointer text-sm font-semibold">Current profile credentials</summary>
                    <ul className="mt-3 space-y-2">
                      {profileDocuments.map(({ id, label }) => (
                        <li key={id}>
                          <a
                            href={`/applications/${application.id}/documents/${id}?source=profile`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-medium text-indigo-700 underline dark:text-indigo-300"
                          >
                            {label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}

                <div className="mt-4">
                  <ApplicationStatusForm
                    applicationId={application.id}
                    current={application.status}
                  />
                </div>

                {application.history.length > 0 && (
                  <div className="mt-4">
                    <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      Status history
                    </h2>
                    <ul className="mt-1 space-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                      {application.history.map((entry) => (
                        <li key={entry.id}>
                          {entry.fromStatus
                            ? humanizeStatus(entry.fromStatus)
                            : "None"}{" "}
                          → {humanizeStatus(entry.toStatus)} by{" "}
                          {entry.actor.name} on{" "}
                          {formatDateTime(entry.createdAt)}
                          {entry.note ? ` — ${entry.note}` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
