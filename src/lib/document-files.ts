/**
 * Shared, environment-independent details about uploaded application
 * documents. Imported by both server code (validation/storage) and client
 * components (the `accept` attribute and size hints), so it must stay free of
 * `server-only` imports and Node built-ins.
 */

/** File types accepted by default: PDF documents and common image scans. */
export const DEFAULT_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;

/** Default maximum size for a single uploaded file (5 MB). */
export const DEFAULT_MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** `accept` attribute matching {@link DEFAULT_ALLOWED_MIME_TYPES}. */
export const DOCUMENT_ACCEPT_ATTRIBUTE = ".pdf,.jpg,.jpeg,.png";

/** File extension (including the leading dot) for a supported MIME type. */
export const MIME_EXTENSIONS: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
};

/** Human-readable label for a supported MIME type. */
export const MIME_LABELS: Record<string, string> = {
  "application/pdf": "PDF",
  "image/jpeg": "JPEG image",
  "image/png": "PNG image",
};

/** Formats a byte count as a short, human-readable string (e.g. "5 MB"). */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** exponent;
  const rounded = exponent === 0 ? value : Math.round(value * 10) / 10;
  return `${rounded} ${units[exponent]}`;
}
