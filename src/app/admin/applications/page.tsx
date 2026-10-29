import type { Metadata } from "next";
import Link from "next/link";

import { Badge, Card, EmptyState } from "@/components/ui";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { summarizeApplicationDocuments, resolveRequirementViews } from "@/lib/application-documents";
import { formatDateTime, humanizeStatus } from "@/lib/format";

export const metadata: Metadata = {
  title: "Applications oversight",
  robots: { index: false, follow: false },
};

const statusTone: Record<string, string> = {
  SUBMITTED: "blue",
  UNDER_REVIEW: "amber",
  SHORTLISTED: "green",
  REJECTED: "red",
};

export default async function AdminApplicationsPage() {
  await requireRole("ADMIN");

  const applications = await prisma.application.findMany({
    orderBy: { submittedAt: "desc" },
    include: {
      candidate: { select: { name: true, email: true } },
      job: {
        select: {
          id: true,
          title: true,
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
      evaluation: { select: { score: true, method: true } },
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
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Applications oversight
      </h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
        Read-only oversight of all applications across the portal.
      </p>

      <div className="mt-6 space-y-3">
        {applications.length === 0 ? (
          <EmptyState
            title="No applications yet"
            description="Applications submitted by candidates will appear here."
          />
        ) : (
          applications.map((application) => {
            const summary = summarizeApplicationDocuments(
              resolveRequirementViews(
                application,
                application.job.documentRequirements,
                application.documents,
              ),
              application.documents,
            );
            return (
              <Card key={application.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-50">
                      {application.candidate.name}
                    </p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      {application.candidate.email}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      Applied for{" "}
                      <Link
                        href={`/recruiter/jobs/${application.job.id}/applications`}
                        className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                      >
                        {application.job.title}
                      </Link>{" "}
                      · {formatDateTime(application.submittedAt)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge tone={statusTone[application.status] ?? "neutral"}>
                      {humanizeStatus(application.status)}
                    </Badge>
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
                    {application.evaluation && (
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        Score {application.evaluation.score}/10
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
