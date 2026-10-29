import "server-only";

import { v2 as cloudinary } from "cloudinary";
import type { UploadApiResponse } from "cloudinary";

const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

/** True when all three Cloudinary credentials are present. */
export function isCloudinaryConfigured(): boolean {
  return Boolean(cloudName && apiKey && apiSecret);
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
});

export type UploadOptions = {
  folder?: string;
  /** Restrict the resource type; `auto` (default) detects from the file. */
  resourceType?: "auto" | "image" | "video" | "raw";
};

/**
 * Streams an in-memory buffer to Cloudinary and resolves with the upload
 * result. Shared by every entry point so uploads behave identically.
 */
export function uploadBuffer(
  buffer: Buffer,
  options: UploadOptions = {},
): Promise<UploadApiResponse> {
  const { folder, resourceType = "auto" } = options;
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        { resource_type: resourceType, ...(folder ? { folder } : {}) },
        (error, result) => {
          if (error || !result) {
            reject(error ?? new Error("Cloudinary returned no result."));
            return;
          }
          resolve(result);
        },
      )
      .end(buffer);
  });
}

/**
 * Deletes an uploaded asset by its public id. Best-effort: an asset that is
 * already gone (or a failure) is not treated as fatal.
 */
export async function deleteCloudAsset(
  publicId: string,
  resourceType: "image" | "video" | "raw" = "image",
): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      invalidate: true,
    });
  } catch {
    // Best-effort cleanup only.
  }
}

export default cloudinary;
