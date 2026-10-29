import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { requireUser } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { isAcceptingApplications } from "@/lib/jobs";
import {
  listJobRequirements,
  requirementLabel,
} from "@/lib/job-documents";
import { listStagedDocuments } from "@/lib/application-documents";
import { DOCUMENT_ACCEPT_ATTRIBUTE } from "@/lib/document-files";
import { Alert, Card } from "@/components/ui";
import { ApplicationForm } from "@/components/applications/application-form";

export const metadata: Metadata = {
  title: "Apply for job",
  robots: { index: false, follow: false },
};

export default async function ApplyJobPage({
  params,
  searchParams,
}: PageProps<"/jobs/[id]/apply">) {
  const user = await requireUser();
  if (user.role !== "CANDIDATE") {
    redirect("/dashboard?error=forbidden");
  }

  const { id: jobId } = await params;
  const { error } = await searchParams;

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) {
    notFound();
  }
  if (!isAcceptingApplications(job)) {
    redirect(`/jobs/${jobId}?error=not-open`);
  }

  const existing = await prisma.application.findUnique({
    where: { candidateId_jobId: { candidateId: user.id, jobId } },
  });
  if (existing) {
    redirect(`/applications/${existing.id}`);
  }

  const [requirements, staged] = await Promise.all([
    listJobRequirements(jobId),
    listStagedDocuments(user.id, jobId),
  ]);

  const requirementSummaries = requirements.map((requirement) => ({
    id: requirement.id,
    label: requirementLabel(requirement),
    description: requirement.description,
    requirementStatus:
      requirement.requirementStatus === "OPTIONAL"
        ? ("OPTIONAL" as const)
        : ("REQUIRED" as const),
  }));

  const initialDocuments = staged.map((document) => ({
    id: document.id,
    requirementId: document.jobDocumentRequirementId,
    originalFileName: document.originalFileName,
    mimeType: document.mimeType,
    fileSize: document.fileSize,
    url: document.cloudUrl,
  }));

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Link
        href={`/jobs/${jobId}`}
        className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
      >
        ← Back to job details
      </Link>
      <h1 className="mt-2 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Apply: {job.title}
      </h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
        {job.department} · {job.location}
      </p>

      {error === "duplicate" && (
        <div className="mt-4">
          <Alert tone="error">
            You have already applied for this job vacancy.
          </Alert>
        </div>
      )}

      <Card className="mt-6">
        <ApplicationForm
          jobId={job.id}
          requirements={requirementSummaries}
          initialDocuments={initialDocuments}
          accept={DOCUMENT_ACCEPT_ATTRIBUTE}
          maxBytes={env.maxUploadBytes}
          initialPhoto={null}
        />
      </Card>
    </main>
  );
}
