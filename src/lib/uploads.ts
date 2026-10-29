import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { env } from "./env";
import {
  formatFileSize,
  MIME_EXTENSIONS,
  MIME_LABELS,
} from "./document-files";

/**
 * Server-side handling of uploaded application documents.
 *
 * Files are written to a private directory (never `public/`) and are only
 * retrievable through an authorized route handler. The declared MIME type from
 * the browser is never trusted: the real type is derived from the file's magic
 * bytes and checked against the configured allow-list.
 */

type Signature = {
  mime: string;
  test: (buffer: Buffer) => boolean;
};

const SIGNATURES: Signature[] = [
  {
    mime: "application/pdf",
    test: (buffer) =>
      buffer.length >= 5 &&
      buffer.subarray(0, 5).toString("latin1") === "%PDF-",
  },
  {
    mime: "image/jpeg",
    test: (buffer) =>
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff,
  },
  {
    mime: "image/png",
    test: (buffer) =>
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a,
  },
];

/** Detects the MIME type from a file's leading bytes, or `null`. */
export function detectMimeType(buffer: Buffer): string | null {
  const match = SIGNATURES.find((signature) => signature.test(buffer));
  return match ? match.mime : null;
}

/**
 * Removes directory components and characters that are unsafe in a filename,
 * while keeping a readable name for recruiters.
 */
export function sanitizeFileName(name: string): string {
  const base = path
    .basename(name)
    .replace(/[\u0000-\u001f<>:"/\\|?*]/g, "_")
    .trim();
  const safe = base.length > 0 ? base : "document";
  return safe.slice(0, 200);
}

export type UploadValidation =
  | {
      ok: true;
      buffer: Buffer;
      mimeType: string;
      fileSize: number;
      originalFileName: string;
    }
  | { ok: false; message: string };

/**
 * Validates an uploaded file: non-empty, within the size limit, and a
 * supported type as determined by its content (not its declared type).
 */
export async function validateUpload(file: File): Promise<UploadValidation> {
  if (!file || typeof file === "string") {
    return { ok: false, message: "No file was provided." };
  }
  if (file.size <= 0) {
    return { ok: false, message: "The uploaded file is empty." };
  }

  const max = env.maxUploadBytes;
  if (file.size > max) {
    return {
      ok: false,
      message: `File is too large. The maximum size is ${formatFileSize(max)}.`,
    };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const mimeType = detectMimeType(buffer);
  if (!mimeType) {
    const allowed = env.allowedUploadMimeTypes
      .map((type) => MIME_LABELS[type] ?? type)
      .join(", ");
    return {
      ok: false,
      message: `Unsupported file type. Allowed formats: ${allowed}.`,
    };
  }
  if (!env.allowedUploadMimeTypes.includes(mimeType)) {
    return { ok: false, message: "This file type is not allowed for upload." };
  }

  return {
    ok: true,
    buffer,
    mimeType,
    fileSize: buffer.length,
    originalFileName: sanitizeFileName(file.name),
  };
}

/** Image MIME types accepted for profile photographs. */
export const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png"] as const;

/**
 * Validates an uploaded profile photo: it must be a supported image, within
 * the size limit, and its real type is derived from the file's bytes.
 */
export async function validateImageUpload(file: File): Promise<UploadValidation> {
  const result = await validateUpload(file);
  if (!result.ok) return result;

  if (!(ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(result.mimeType)) {
    return {
      ok: false,
      message: "The profile photo must be a JPEG or PNG image.",
    };
  }
  return result;
}

/** Builds an opaque storage key for a new upload, including its extension. */
export function buildStorageKey(prefix: string, mimeType: string): string {
  const extension = MIME_EXTENSIONS[mimeType] ?? "";
  const normalizedPrefix = prefix.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  return `${normalizedPrefix}/${randomUUID()}${extension}`;
}

/**
 * Resolves a storage key to an absolute path, rejecting any key that would
 * escape the configured upload directory (path-traversal guard).
 */
export function resolveStoragePath(storageKey: string): string {
  const root = path.resolve(env.uploadDir);
  const resolved = path.resolve(root, storageKey);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new Error("Invalid storage key.");
  }
  return resolved;
}

/** Writes a file to private storage with owner-only permissions. */
export async function writeStoredFile(
  storageKey: string,
  data: Buffer,
): Promise<void> {
  const destination = resolveStoragePath(storageKey);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, data, { mode: 0o600 });
}

/** Reads a stored file, or throws if it is missing or the key is invalid. */
export async function readStoredFile(storageKey: string): Promise<Buffer> {
  return readFile(resolveStoragePath(storageKey));
}

/** Deletes a stored file, ignoring the case where it no longer exists. */
export async function deleteStoredFile(storageKey: string): Promise<void> {
  try {
    await rm(resolveStoragePath(storageKey), { force: true });
  } catch {
    // Best-effort cleanup: an invalid or already-removed key is not an error.
  }
}
