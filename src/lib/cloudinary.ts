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
  deliveryType?: "upload" | "authenticated";
};

/**
 * Streams an in-memory buffer to Cloudinary and resolves with the upload
 * result. Shared by every entry point so uploads behave identically.
 */
export function uploadBuffer(
  buffer: Buffer,
  options: UploadOptions = {},
): Promise<UploadApiResponse> {
  const { folder, resourceType = "auto", deliveryType } = options;
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        { resource_type: resourceType, ...(folder ? { folder } : {}), ...(deliveryType ? { type: deliveryType } : {}) },
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
  deliveryType?: "upload" | "authenticated",
): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      ...(deliveryType ? { type: deliveryType } : {}),
      invalidate: true,
    });
  } catch {
    // Best-effort cleanup only.
  }
}

export function signedDocumentUrl(publicId: string, deliveryUrl: string, format: string) {
  const url = new URL(deliveryUrl);
  const delivery = url.pathname.match(/^\/(?:[^/]+\/)?(image|raw)\/(upload|private|authenticated)\//);
  if (url.protocol !== "https:" ||
    (url.hostname !== "res.cloudinary.com" && !url.hostname.endsWith(".res.cloudinary.com")) ||
    !delivery) {
    throw new Error("Invalid Cloudinary document URL.");
  }
  const resourceType = delivery[1] as "image" | "raw";
  const type = delivery[2] as "upload" | "private" | "authenticated";
  return cloudinary.utils.private_download_url(publicId, resourceType === "raw" ? "" : format, {
    resource_type: resourceType,
    type,
    attachment: false,
    expires_at: Math.floor(Date.now() / 1000) + 60,
  });
}

export default cloudinary;
