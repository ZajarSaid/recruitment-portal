"use server";

import { uploadBuffer } from "@/lib/cloudinary";
import { validateUpload } from "@/lib/uploads";

/**
 * Server-action entry point for uploading a file to Cloudinary.
 * Applies the same validation as local uploads (size, magic-byte MIME check)
 * before streaming the buffer to the cloud.
 */
export async function uploadFile(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("No file was provided.");

  const validation = await validateUpload(file);
  if (!validation.ok) throw new Error(validation.message);

  return uploadBuffer(validation.buffer, { folder: "uploads" });
}
