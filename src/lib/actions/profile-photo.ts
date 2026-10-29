"use server";

import { getCurrentUser } from "@/lib/dal";
import { storeUploadedFile } from "@/lib/cloud-storage";
import { validateImageUpload } from "@/lib/uploads";

/**
 * Uploads a candidate's profile photograph before the application is
 * submitted. Nothing is persisted here: the resulting asset reference and URL
 * are returned to the client and carried into the application on submission.
 * The previous photo, if any, is replaced when the application is saved.
 */

export type ProfilePhotoState =
  | {
      ok: true;
      url: string | null;
      publicId: string;
      originalFileName: string;
      mimeType: string;
      fileSize: number;
    }
  | { ok: false; message: string }
  | undefined;

export async function uploadProfilePhotoAction(
  _prev: ProfilePhotoState,
  formData: FormData,
): Promise<ProfilePhotoState> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, message: "You must be signed in to upload a photo." };
  }
  if (user.role !== "CANDIDATE") {
    return { ok: false, message: "Only candidates can upload a profile photo." };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, message: "Please choose an image to upload." };
  }

  const validation = await validateImageUpload(file);
  if (!validation.ok) {
    return { ok: false, message: validation.message };
  }

  try {
    const stored = await storeUploadedFile(validation.buffer, {
      folder: `profile-photos/${user.id}`,
      mimeType: validation.mimeType,
      resourceType: "image",
    });

    return {
      ok: true,
      url: stored.url,
      publicId: stored.reference,
      originalFileName: validation.originalFileName,
      mimeType: validation.mimeType,
      fileSize: validation.fileSize,
    };
  } catch {
    return { ok: false, message: "Failed to upload the photo. Please try again." };
  }
}
