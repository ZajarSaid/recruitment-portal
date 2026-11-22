import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { requireUser } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { isAcceptingApplications } from "@/lib/jobs";
import { getProfileReadiness } from "@/lib/profile";
import { listStagedDocuments } from "@/lib/application-documents";
import { APPLICATION_LETTER_KEY, getCategoryDocumentList, JOB_CATEGORY_LABELS } from "@/lib/profile-documents";
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

  const { profile, canApply } = await getProfileReadiness(user);
  if (!profile || !canApply) {
    redirect(`/profile?next=${encodeURIComponent(`/jobs/${jobId}/apply`)}&incomplete=1`);
  }
  const savedDocuments = new Map(profile.documents.map((document) => [document.documentKey, document]));
  const credentials = getCategoryDocumentList(profile.category).flatMap((spec) => {
    const document = savedDocuments.get(spec.key);
    return document ? [{ id: document.id, label: spec.label }] : [];
  });

  const staged = await listStagedDocuments(user.id, jobId);
  const stagedLetter =
    staged.find((document) => document.documentKey === APPLICATION_LETTER_KEY) ??
    null;

  const initialLetter = stagedLetter
    ? {
        id: stagedLetter.id,
        documentKey: stagedLetter.documentKey,
        originalFileName: stagedLetter.originalFileName,
        mimeType: stagedLetter.mimeType,
        fileSize: stagedLetter.fileSize,
        url: stagedLetter.cloudUrl,
      }
    : null;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href={`/jobs/${jobId}`}
        className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
      >
        Back to job details
      </Link>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        Apply for {job.title}
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

      <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card>
          <ApplicationForm
            jobId={job.id}
            accept={DOCUMENT_ACCEPT_ATTRIBUTE}
            maxBytes={env.maxUploadBytes}
            initialLetter={initialLetter}
          />
        </Card>
        <aside aria-labelledby="saved-profile-title">
          <Card>
            <h2 id="saved-profile-title" className="text-lg font-semibold">Credentials on file</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
              Your personal details and education are saved under {JOB_CATEGORY_LABELS[profile.category]}.
            </p>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
              The recruitment team can view your current profile credentials after you submit.
            </p>
            {credentials.length > 0 && (
              <ul className="mt-4 divide-y divide-zinc-200 border-y border-zinc-200 text-sm dark:divide-zinc-800 dark:border-zinc-800">
                {credentials.map((credential) => (
                  <li key={credential.id} className="py-2.5">{credential.label}</li>
                ))}
              </ul>
            )}
            <Link
              href={{ pathname: "/profile", query: { next: `/jobs/${job.id}/apply` } }}
              className="mt-4 inline-flex text-sm font-semibold text-indigo-700 hover:underline dark:text-indigo-300"
            >
              View your profile
            </Link>
          </Card>
        </aside>
      </div>
    </main>
  );
}
