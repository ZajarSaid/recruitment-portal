"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/dal";
import { isAcceptingApplications } from "@/lib/jobs";
import { deleteStoredUpload, storeUploadedFile } from "@/lib/cloud-storage";
import { validateUpload } from "@/lib/uploads";

/**
 * Candidate-driven staged document uploads.
 *
 * Each file is uploaded on its own, before the application is submitted, so a
 * slow or failed upload never creates a half-complete application. Staged
 * rows are tied to a (candidate, vacancy, requirement) triple and reused when
 * the application is finally submitted. Files are stored through the storage
 * abstraction (Cloudinary when configured, otherwise local private storage).
 */

export type StagedDocumentInfo = {
  id: string;
  requirementId: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  url: string | null;
};

export type DocumentActionState =
  | {
      ok?: boolean;
      message?: string;
      requirementId?: string;
      document?: StagedDocumentInfo | null;
    }
  | undefined;

function stringField(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function uploadStagedDocumentAction(
  _prev: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  const user = await getCurrentUser();
  if (!user) {
    return { message: "You must be signed in to upload documents." };
  }
  if (user.role !== "CANDIDATE") {
    return { message: "Only candidates can upload application documents." };
  }

  const jobId = stringField(formData, "jobId");
  const requirementId = stringField(formData, "requirementId");
  const file = formData.get("file");

  if (!jobId || !requirementId) {
    return { message: "Missing job or document requirement." };
  }
  if (!(file instanceof File)) {
    return { requirementId, message: "Please choose a file to upload." };
  }

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { id: true, status: true, opensAt: true, closesAt: true },
  });
  if (!job) {
    return { requirementId, message: "Job vacancy not found." };
  }
  if (!isAcceptingApplications(job)) {
    return {
      requirementId,
      message: "This vacancy is no longer accepting documents.",
    };
  }

  const requirement = await prisma.jobDocumentRequirement.findFirst({
    where: { id: requirementId, jobId },
    select: { id: true },
  });
  if (!requirement) {
    return { requirementId, message: "Document requirement not found." };
  }

  const validation = await validateUpload(file);
  if (!validation.ok) {
    return { requirementId, message: validation.message };
  }

  const previous = await prisma.stagedDocument.findUnique({
    where: {
      candidateId_jobId_jobDocumentRequirementId: {
        candidateId: user.id,
        jobId,
        jobDocumentRequirementId: requirementId,
      },
    },
    select: { storageKey: true },
  });

  let stored;
  try {
    stored = await storeUploadedFile(validation.buffer, {
      folder: `documents/${user.id}`,
      mimeType: validation.mimeType,
    });
  } catch {
    return {
      requirementId,
      message: "Failed to store the file. Please try again.",
    };
  }

  let staged;
  try {
    staged = await prisma.stagedDocument.upsert({
      where: {
        candidateId_jobId_jobDocumentRequirementId: {
          candidateId: user.id,
          jobId,
          jobDocumentRequirementId: requirementId,
        },
      },
      create: {
        candidateId: user.id,
        jobId,
        jobDocumentRequirementId: requirementId,
        storageKey: stored.reference,
        cloudUrl: stored.url,
        originalFileName: validation.originalFileName,
        mimeType: validation.mimeType,
        fileSize: validation.fileSize,
      },
      update: {
        storageKey: stored.reference,
        cloudUrl: stored.url,
        originalFileName: validation.originalFileName,
        mimeType: validation.mimeType,
        fileSize: validation.fileSize,
      },
    });
  } catch {
    await deleteStoredUpload(stored.reference);
    return {
      requirementId,
      message: "Failed to save the document. Please try again.",
    };
  }

  if (previous && previous.storageKey !== stored.reference) {
    await deleteStoredUpload(previous.storageKey);
  }

  revalidatePath(`/jobs/${jobId}/apply`);

  return {
    ok: true,
    requirementId,
    message: "Document uploaded.",
    document: {
      id: staged.id,
      requirementId,
      originalFileName: staged.originalFileName,
      mimeType: staged.mimeType,
      fileSize: staged.fileSize,
      url: staged.cloudUrl,
    },
  };
}

export async function removeStagedDocumentAction(
  _prev: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  const user = await getCurrentUser();
  if (!user) {
    return { message: "You must be signed in to manage documents." };
  }
  if (user.role !== "CANDIDATE") {
    return { message: "Only candidates can manage application documents." };
  }

  const jobId = stringField(formData, "jobId");
  const requirementId = stringField(formData, "requirementId");
  if (!jobId || !requirementId) {
    return { message: "Missing job or document requirement." };
  }

  const staged = await prisma.stagedDocument.findUnique({
    where: {
      candidateId_jobId_jobDocumentRequirementId: {
        candidateId: user.id,
        jobId,
        jobDocumentRequirementId: requirementId,
      },
    },
    select: { id: true, storageKey: true },
  });
  if (!staged) {
    return { ok: true, requirementId, document: null, message: "Removed." };
  }

  await prisma.stagedDocument.delete({ where: { id: staged.id } });
  await deleteStoredUpload(staged.storageKey);

  revalidatePath(`/jobs/${jobId}/apply`);

  return { ok: true, requirementId, document: null, message: "Removed." };
}
