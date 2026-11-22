"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/dal";
import { isAcceptingApplications } from "@/lib/jobs";
import { deleteStoredUpload, storeUploadedFile } from "@/lib/cloud-storage";
import { validateUpload } from "@/lib/uploads";
import { APPLICATION_LETTER_KEY } from "@/lib/profile-documents";

/**
 * Candidate-driven staged document uploads.
 *
 * With profile-based applications, the only document staged before an
 * application is submitted is the signed application letter. Each file is
 * uploaded on its own, before the application is created, so a slow or failed
 * upload never creates a half-complete application. The staged row is tied to
 * (candidate, vacancy, documentKey) and reused when the application is
 * finally submitted. Files are stored through the storage abstraction
 * (Cloudinary when configured, otherwise local private storage).
 */

export type StagedDocumentInfo = {
  id: string;
  documentKey: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  url: string | null;
};

export type DocumentActionState =
  | {
      ok?: boolean;
      message?: string;
      documentKey?: string;
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
  const documentKey = stringField(formData, "documentKey");
  const file = formData.get("file");

  if (!jobId || !documentKey) {
    return { message: "Missing job or document." };
  }
  if (documentKey !== APPLICATION_LETTER_KEY) {
    return { documentKey, message: "Unknown application document." };
  }
  if (!(file instanceof File)) {
    return { documentKey, message: "Please choose a file to upload." };
  }

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { id: true, status: true, opensAt: true, closesAt: true },
  });
  if (!job) {
    return { documentKey, message: "Job vacancy not found." };
  }
  if (!isAcceptingApplications(job)) {
    return {
      documentKey,
      message: "This vacancy is no longer accepting documents.",
    };
  }

  const validation = await validateUpload(file);
  if (!validation.ok) {
    return { documentKey, message: validation.message };
  }

  const previous = await prisma.stagedDocument.findUnique({
    where: {
      candidateId_jobId_documentKey: {
        candidateId: user.id,
        jobId,
        documentKey,
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
      documentKey,
      message: "Failed to store the file. Please try again.",
    };
  }

  let staged;
  try {
    staged = await prisma.stagedDocument.upsert({
      where: {
        candidateId_jobId_documentKey: {
          candidateId: user.id,
          jobId,
          documentKey,
        },
      },
      create: {
        candidateId: user.id,
        jobId,
        documentKey,
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
      documentKey,
      message: "Failed to save the document. Please try again.",
    };
  }

  if (previous && previous.storageKey !== stored.reference) {
    await deleteStoredUpload(previous.storageKey);
  }

  revalidatePath(`/jobs/${jobId}/apply`);

  return {
    ok: true,
    documentKey,
    message: "Document uploaded.",
    document: {
      id: staged.id,
      documentKey,
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
  const documentKey = stringField(formData, "documentKey");
  if (!jobId || !documentKey) {
    return { message: "Missing job or document." };
  }

  const staged = await prisma.stagedDocument.findUnique({
    where: {
      candidateId_jobId_documentKey: {
        candidateId: user.id,
        jobId,
        documentKey,
      },
    },
    select: { id: true, storageKey: true },
  });
  if (!staged) {
    return { ok: true, documentKey, document: null, message: "Removed." };
  }

  await prisma.stagedDocument.delete({ where: { id: staged.id } });
  await deleteStoredUpload(staged.storageKey);

  revalidatePath(`/jobs/${jobId}/apply`);

  return { ok: true, documentKey, document: null, message: "Removed." };
}
