"use server";

import { revalidatePath } from "next/cache";

import {
  ActionState,
  profileSchema,
  toFieldErrors,
} from "@/lib/definitions";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/dal";
import { deleteStoredUpload, storeUploadedFile } from "@/lib/cloud-storage";
import { validateUpload } from "@/lib/uploads";
import { findProfileDocumentSpec } from "@/lib/profile-documents";
import {
  firstIncompleteProfileStep,
  hasRequiredProfileDocuments,
  missingStepFields,
  PROFILE_STEPS,
} from "@/lib/profile-steps";

/**
 * Candidate master-profile server actions.
 *
 * The profile is filled once and reused for every future application:
 * common personal information (education, birth year/month, physical
 * address, computer literacy, languages), the candidate's professional
 * category, and the category-specific supporting documents.
 */

function formDataToObject(formData: FormData): Record<string, string> {
  const obj: Record<string, string> = {};
  for (const [k, v] of formData.entries()) {
    if (typeof v === "string") obj[k] = v;
  }
  return obj;
}

const stepSchemas = {
  "personal-details": profileSchema.pick({ birthYear: true, birthMonth: true, physicalAddress: true }),
  education: profileSchema.pick({ educationLevel: true, category: true }),
  "computer-literacy": profileSchema.pick({ computerLiteracy: true }),
  languages: profileSchema.pick({ languages: true }),
  experience: profileSchema.pick({ experienceSummary: true }),
};

export async function saveProfileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) {
    return { message: "You must be signed in to manage your profile." };
  }
  if (user.role !== "CANDIDATE") {
    return { message: "Only candidates have a candidate profile." };
  }

  const stepIndex = PROFILE_STEPS.findIndex(({ id }) => id === formData.get("step"));
  const step = PROFILE_STEPS[stepIndex];
  if (!step) return { message: "Choose a profile step before saving." };

  const parsed = stepSchemas[step.id].safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { errors: toFieldErrors(parsed.error) };
  }

  const fields = missingStepFields(step, parsed.data);
  if (Object.keys(fields).length) return { errors: fields };

  try {
    const profile = await prisma.candidateProfile.findUnique({
      where: { userId: user.id },
      include: { documents: { select: { documentKey: true } } },
    });
    const documents = profile?.documents ?? [];
    if (stepIndex > firstIncompleteProfileStep(profile, documents)) {
      return { message: "Complete and save the earlier profile steps first." };
    }
    if ("category" in parsed.data && !hasRequiredProfileDocuments(parsed.data.category, documents)) {
      return { message: "Upload all required documents for this category before continuing." };
    }
    const values = parsed.data;
    const data = "experienceSummary" in values && values.experienceSummary !== undefined
      ? { experienceSummary: values.experienceSummary || null }
      : values;
    await prisma.candidateProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...data },
      update: data,
    });
  } catch {
    return { message: "Could not save your profile. Please try again." };
  }

  revalidatePath("/profile", "layout");
  revalidatePath("/dashboard");

  return { ok: true, message: "Profile saved." };
}

export type ProfileDocumentState =
  | {
      ok?: boolean;
      message?: string;
      documentKey?: string;
      document?: {
        id: string;
        documentKey: string;
        originalFileName: string;
        mimeType: string;
        fileSize: number;
        url: string | null;
      } | null;
    }
  | undefined;

export async function uploadProfileDocumentAction(
  _prev: ProfileDocumentState,
  formData: FormData,
): Promise<ProfileDocumentState> {
  const user = await getCurrentUser();
  if (!user) {
    return { message: "You must be signed in to upload documents." };
  }
  if (user.role !== "CANDIDATE") {
    return { message: "Only candidates can upload profile documents." };
  }

  const documentKey = typeof formData.get("documentKey") === "string"
    ? (formData.get("documentKey") as string).trim()
    : "";
  const file = formData.get("file");
  if (!documentKey) {
    return { message: "Missing document type." };
  }

  const spec = findProfileDocumentSpec(documentKey);
  if (!spec) {
    return { documentKey, message: "Unknown profile document." };
  }
  if (!(file instanceof File)) {
    return { documentKey, message: "Please choose a file to upload." };
  }

  const profile = await prisma.candidateProfile.findUnique({
    where: { userId: user.id },
    select: { id: true, category: true },
  });
  if (!profile) {
    return {
      documentKey,
      message:
        "Save your profile details first, then upload the supporting documents.",
    };
  }

  const validation = await validateUpload(file);
  if (!validation.ok) {
    return { documentKey, message: validation.message };
  }

  const previous = await prisma.candidateDocument.findUnique({
    where: {
      profileId_documentKey: {
        profileId: profile.id,
        documentKey,
      },
    },
    select: { storageKey: true },
  });

  let stored;
  try {
    stored = await storeUploadedFile(validation.buffer, {
      folder: `profile-documents/${user.id}`,
      mimeType: validation.mimeType,
    });
  } catch {
    return {
      documentKey,
      message: "Failed to store the file. Please try again.",
    };
  }

  let document;
  try {
    document = await prisma.candidateDocument.upsert({
      where: {
        profileId_documentKey: {
          profileId: profile.id,
          documentKey,
        },
      },
      create: {
        profileId: profile.id,
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

  revalidatePath("/profile", "layout");
  revalidatePath("/dashboard");

  return {
    ok: true,
    documentKey,
    message: "Document uploaded.",
    document: {
      id: document.id,
      documentKey,
      originalFileName: document.originalFileName,
      mimeType: document.mimeType,
      fileSize: document.fileSize,
      url: document.cloudUrl,
    },
  };
}

export async function removeProfileDocumentAction(
  _prev: ProfileDocumentState,
  formData: FormData,
): Promise<ProfileDocumentState> {
  const user = await getCurrentUser();
  if (!user) {
    return { message: "You must be signed in to manage documents." };
  }
  if (user.role !== "CANDIDATE") {
    return { message: "Only candidates can manage profile documents." };
  }

  const documentKey = typeof formData.get("documentKey") === "string"
    ? (formData.get("documentKey") as string).trim()
    : "";
  if (!documentKey) {
    return { message: "Missing document type." };
  }

  const profile = await prisma.candidateProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!profile) {
    return { ok: true, documentKey, document: null, message: "Removed." };
  }

  const document = await prisma.candidateDocument.findUnique({
    where: {
      profileId_documentKey: {
        profileId: profile.id,
        documentKey,
      },
    },
    select: { id: true, storageKey: true },
  });
  if (!document) {
    return { ok: true, documentKey, document: null, message: "Removed." };
  }

  await prisma.candidateDocument.delete({ where: { id: document.id } });
  await deleteStoredUpload(document.storageKey);

  revalidatePath("/profile", "layout");
  revalidatePath("/dashboard");

  return { ok: true, documentKey, document: null, message: "Removed." };
}
