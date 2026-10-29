import Link from "next/link";

import { requireUser } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { summarizeApplicationDocuments, resolveRequirementViews } from "@/lib/application-documents";
import { formatDate, humanizeStatus } from "@/lib/format";
import { Badge, Card, EmptyState } from "@/components/ui";

export default async function DashboardApplications() {
  const user = await requireUser();
  if (user.role !== "CANDIDATE") return null;

  const applications = await prisma.application.findMany({
    where: { candidateId: user.id },
    orderBy: { submittedAt: "desc" },
    include: {
      job: {
        select: {
          id: true,
          title: true,
          department: true,
          location: true,
          documentRequirements: {
            orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
            select: {
              id: true,
              customName: true,
              description: true,
              requirementStatus: true,
              displayOrder: true,
              documentType: { select: { name: true } },
            },
          },
        },
      },
      evaluation: { select: { score: true, method: true, notes: true, evaluatedAt: true } },
      documents: {
        select: {
          id: true,
          jobDocumentRequirementId: true,
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
    <section className="mt-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          My applications
        </h2>
        <Link
          href="/jobs"
          className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
        >
          Browse jobs →
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
              resolveRequirementViews(
                app,
                app.job.documentRequirements,
                app.documents,
              ),
              app.documents,
            );
            return (
              <Card key={app.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className="font-medium text-zinc-900 dark:text-zinc-50">
                      {app.job.title}
                    </span>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      {app.job.department} · {app.job.location}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      Submitted {formatDate(app.submittedAt)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge tone={statusTone[app.status] ?? "neutral"}>
                      {humanizeStatus(app.status)}
                    </Badge>
                    <Link
                      href={`/applications/${app.id}`}
                      className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                    >
                      View status →
                    </Link>
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
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">
                      Submitted documents
                    </p>
                    <ul className="mt-1 space-y-1">
                      {summary.requirements.map((item) => (
                        <li
                          key={item.id}
                          className="flex flex-wrap items-center justify-between gap-2 text-xs"
                        >
                          <span className="text-zinc-700 dark:text-zinc-300">
                            {item.label}
                          </span>
                          {item.document ? (
                            <span className="flex items-center gap-2">
                              <a
                                href={`/applications/${app.id}/documents/${item.document.id}`}
                                target="_blank"
                                rel="noreferrer"
                                className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
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
                  </div>
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
