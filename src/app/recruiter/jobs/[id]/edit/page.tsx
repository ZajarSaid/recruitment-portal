import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { JobForm } from "@/components/jobs/job-form";
import { requireRole } from "@/lib/dal";
import { toDateInputValue } from "@/lib/format";
import { listDocumentTypes, listJobRequirements } from "@/lib/job-documents";
import { getManagedJob } from "@/lib/jobs";

export const metadata: Metadata = {
  title: "Edit vacancy",
  robots: { index: false, follow: false },
};

export default async function EditJobPage({
  params,
}: PageProps<"/recruiter/jobs/[id]/edit">) {
  const user = await requireRole("RECRUITER", "ADMIN");
  const { id } = await params;

  const job = await getManagedJob(id, user);
  if (!job) {
    notFound();
  }

  const [documentTypes, requirements] = await Promise.all([
    listDocumentTypes(),
    listJobRequirements(job.id),
  ]);

  return (
    <div>
      <Link
        href={`/recruiter/jobs/${job.id}`}
        className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
      >
        ← Back to vacancy
      </Link>
      <h1 className="mt-2 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Edit vacancy
      </h1>

      <div className="mt-6 max-w-2xl">
        <JobForm
          job={{
            id: job.id,
            title: job.title,
            department: job.department,
            location: job.location,
            description: job.description,
            qualifications: job.qualifications,
            opensAt: toDateInputValue(job.opensAt),
            closesAt: toDateInputValue(job.closesAt),
          }}
          documentTypes={documentTypes}
          requirements={requirements.map((requirement) => ({
            id: requirement.id,
            documentTypeId: requirement.documentTypeId,
            customName: requirement.customName,
            description: requirement.description,
            requirementStatus: requirement.requirementStatus,
          }))}
        />
      </div>
    </div>
  );
}
