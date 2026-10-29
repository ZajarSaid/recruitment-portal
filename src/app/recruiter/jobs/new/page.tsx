import type { Metadata } from "next";

import { JobForm } from "@/components/jobs/job-form";
import { requireRole } from "@/lib/dal";
import { listDocumentTypes } from "@/lib/job-documents";

export const metadata: Metadata = {
  title: "Create vacancy",
  robots: { index: false, follow: false },
};

export default async function NewJobPage() {
  await requireRole("RECRUITER", "ADMIN");
  const documentTypes = await listDocumentTypes();

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Create a vacancy
      </h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
        Save the vacancy as a draft to refine it later, or publish it straight
        away.
      </p>

      <div className="mt-6 max-w-2xl">
        <JobForm documentTypes={documentTypes} />
      </div>
    </div>
  );
}
