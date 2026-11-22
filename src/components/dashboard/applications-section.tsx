import Link from "next/link";

import { requireUser } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { summarizeApplicationDocuments, resolveRequirementViews } from "@/lib/application-documents";
import { formatDate, humanizeStatus } from "@/lib/format";
import { Badge, Card, EmptyState } from "@/components/ui";

export default async function DashboardApplications({ embedded = false }: { embedded?: boolean }) {
  const user = await requireUser();
  if (user.role !== "CANDIDATE") return null;

  const applications = await prisma.application.findMany({
    where: { candidateId: user.id },
    orderBy: [{ updatedAt: "desc" }, { submittedAt: "desc" }],
    include: {
      job: {
        select: {
          id: true,
          title: true,
          department: true,
          location: true,
        },
      },
      evaluation: { select: { score: true, method: true, notes: true, evaluatedAt: true } },
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
        },
      },
    },
  });

  return (
    <section className={embedded ? "rounded-2xl border border-indigo-100 bg-white p-4 sm:p-6 dark:border-zinc-800 dark:bg-zinc-950" : "mt-8"}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {embedded ? "My applications" : "Submitted applications"}
        </h2>
        <Link
          href="/jobs"
          className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
        >
          Browse jobs
        </Link>
      </div>

      {applications.length === 0 ? (
        <EmptyState
          title="No applications yet"
          description="When you apply to a published vacancy, it will appear here with its status."
          action={
            <Link
              href="/jobs"
              className="inline-flex rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Browse vacancies
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {applications.map((app) => {
            const summary = summarizeApplicationDocuments(
              resolveRequirementViews(app),
              app.documents,
            );
            return (
              <Card key={app.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                      <Link href={`/applications/${app.id}`} className="hover:underline">
                        {app.job.title}
                      </Link>
                    </h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      {app.job.department} · {app.job.location}
                    </p>
                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                      Last updated <time dateTime={app.updatedAt.toISOString()}>{formatDate(app.updatedAt)}</time>
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge tone={statusTone[app.status] ?? "neutral"}>
                      {humanizeStatus(app.status)}
                    </Badge>
                  </div>
                </div>
                {app.evaluation && (
                  <div className="mt-3 rounded-md border border-zinc-200 p-3 text-sm dark:border-zinc-800">
                    <p>
                      <span className="font-medium">Resume quality score:</span>{" "}
                      {app.evaluation.score}/10
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {app.evaluation.method}
                      {app.evaluation.evaluatedAt &&
                        ` · ${formatDate(app.evaluation.evaluatedAt)}`}
                    </p>
                  </div>
                )}

                {summary.requirements.length > 0 && (
                  <details className="mt-4 border-t border-zinc-200 pt-3 dark:border-zinc-800">
                    <summary className="cursor-pointer text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      Submitted documents
                    </summary>
                    <ul className="mt-3 space-y-2">
                      {summary.requirements.map((item) => (
                        <li
                          key={item.id}
                          className="flex flex-wrap items-center justify-between gap-2 text-sm"
                        >
                          <span className="text-zinc-700 dark:text-zinc-300">
                            {item.label}
                          </span>
                          {item.document ? (
                            <span className="flex min-w-0 flex-wrap items-center gap-2">
                              <a
                                href={`/applications/${app.id}/documents/${item.document.id}`}
                                target="_blank"
                                rel="noreferrer"
                                className="wrap-anywhere font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                              >
                                {item.document.originalFileName}
                              </a>
                              <Badge tone={reviewTone[item.status] ?? "neutral"}>
                                {reviewLabel[item.status] ?? item.status}
                              </Badge>
                            </span>
                          ) : (
                            <Badge tone="neutral">Not submitted</Badge>
                          )}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}

const statusTone: Record<string, string> = {
  SUBMITTED: "blue",
  UNDER_REVIEW: "amber",
  SHORTLISTED: "green",
  REJECTED: "red",
};

const reviewTone: Record<string, string> = {
  MISSING: "neutral",
  PENDING: "amber",
  ACCEPTED: "green",
  REJECTED: "red",
};

const reviewLabel: Record<string, string> = {
  PENDING: "Pending review",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
};
