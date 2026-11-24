import "server-only";

import {
  deleteCloudAsset,
  isCloudinaryConfigured,
  signedDocumentUrl,
  uploadBuffer,
} from "./cloudinary";
import {
  buildStorageKey,
  deleteStoredFile,
  detectMimeType,
  readStoredFile,
  writeStoredFile,
} from "./uploads";
import { MIME_EXTENSIONS } from "./document-files";

/**
 * Storage backend abstraction for uploaded files.
 *
 * When Cloudinary credentials are configured, files are streamed to the cloud
 * and the returned `reference` is the asset's `public_id`, with `url` holding
 * the public delivery URL. Otherwise the module falls back to the local
 * private-storage implementation so development and tests keep working without
 * any cloud account.
 *
 * A persisted `storageKey` may therefore be either a Cloudinary public id or a
 * local storage key. `isCloudReference` disambiguates the two, and reading a
 * file branches accordingly (see the document download route handler).
 */

export type StoredFile = {
  /** `public_id` (cloud) or opaque key (local) to persist as `storageKey`. */
  reference: string;
  /** Public delivery URL (cloud only); `null` when stored locally. */
  url: string | null;
  backend: "cloud" | "local";
};

/** Prefix that marks a persisted storage key as a Cloudinary `public_id`. */
const CLOUD_PREFIX = "cloud:";

/** Returns true when the given storage key refers to a Cloudinary asset. */
export function isCloudReference(storageKey: string): boolean {
  return storageKey.startsWith(CLOUD_PREFIX);
}

/** Prefixes a Cloudinary `public_id` so it is recognisable in the database. */
export function toCloudReference(publicId: string): string {
  return `${CLOUD_PREFIX}${publicId}`;
}

/** Extracts the Cloudinary `public_id` from a stored cloud reference. */
export function fromCloudReference(reference: string): string {
  return reference.slice(CLOUD_PREFIX.length);
}

/** Whether the app is currently persisting uploads to Cloudinary. */
export function usesCloudStorage(): boolean {
  return isCloudinaryConfigured();
}

/**
 * Persists an in-memory buffer and returns a reference plus (for cloud) a
 * public URL. The caller stores `reference` as `storageKey` and `url` as
 * `cloudUrl`.
 */
export async function storeUploadedFile(
  buffer: Buffer,
  file: {
    folder: string;
    mimeType: string;
    resourceType?: "auto" | "image" | "video" | "raw";
  },
): Promise<StoredFile> {
  if (!isCloudinaryConfigured()) {
    const key = buildStorageKey(file.folder, file.mimeType);
    await writeStoredFile(key, buffer);
    return { reference: key, url: null, backend: "local" };
  }

  const result = await uploadBuffer(buffer, {
    folder: file.folder,
    resourceType: file.resourceType ?? "auto",
  });
  return {
    reference: toCloudReference(result.public_id),
    url: result.secure_url,
    backend: "cloud",
  };
}

/**
 * Deletes a stored file given its persisted reference. Handles both cloud
 * (`cloud:`-prefixed) and local keys, and never throws for a missing file.
 */
export async function deleteStoredUpload(
  reference: string,
  resourceType: "image" | "video" | "raw" = "image",
): Promise<void> {
  if (isCloudReference(reference)) {
    await deleteCloudAsset(fromCloudReference(reference), resourceType);
    return;
  }
  await deleteStoredFile(reference);
}

/**
 * Reads the original document bytes with server-side credentials for cloud
 * assets. Provider error responses must never reach the document viewer.
 */
export async function resolveStoredUpload(
  reference: string,
  cloudUrl: string | null,
  mimeType: string,
): Promise<Buffer> {
  if (!isCloudReference(reference)) return readStoredFile(reference);

  const format = MIME_EXTENSIONS[mimeType]?.slice(1);
  if (!cloudUrl || !format) throw new Error("Cloud document has incomplete metadata.");
  const url = signedDocumentUrl(fromCloudReference(reference), cloudUrl, format);
  const response = await fetch(url, {
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error("Cloud document could not be fetched.");
  }
  const data = Buffer.from(await response.arrayBuffer());
  if (detectMimeType(data) !== mimeType) throw new Error("Cloud document content does not match its file type.");
  return data;
}
