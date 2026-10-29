import "server-only";

import path from "node:path";

import {
  DEFAULT_ALLOWED_MIME_TYPES,
  DEFAULT_MAX_UPLOAD_BYTES,
} from "./document-files";

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(
      `Missing required environment variable "${name}". See .env.example for the expected configuration.`,
    );
  }
  return value;
}

function positiveInt(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

export const env = {
  get sessionSecret(): string {
    return required("SESSION_SECRET");
  },
  get appUrl(): string {
    return process.env.APP_URL ?? "http://localhost:3000";
  },
  get isProduction(): boolean {
    return process.env.NODE_ENV === "production";
  },
  get cookieSecure(): boolean {
    return process.env.SESSION_COOKIE_SECURE === "true";
  },
  /**
   * Directory for privately stored application documents. Deliberately kept
   * outside `public/` so files are only ever served through an authorized
   * route handler. Defaults to `<project>/storage`.
   */
  get uploadDir(): string {
    const configured = process.env.UPLOAD_DIR?.trim();
    return configured && configured.length > 0
      ? path.resolve(configured)
      : path.join(process.cwd(), "storage");
  },
  /** Maximum size (bytes) accepted for a single uploaded file. */
  get maxUploadBytes(): number {
    return positiveInt(
      process.env.UPLOAD_MAX_FILE_SIZE_BYTES,
      DEFAULT_MAX_UPLOAD_BYTES,
    );
  },
  /** MIME types accepted for uploads (comma-separated env override). */
  get allowedUploadMimeTypes(): string[] {
    const raw = process.env.UPLOAD_ALLOWED_MIME_TYPES;
    if (!raw || raw.trim().length === 0) {
      return [...DEFAULT_ALLOWED_MIME_TYPES];
    }
    const parsed = raw
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter((value) => value.length > 0);
    return parsed.length > 0 ? parsed : [...DEFAULT_ALLOWED_MIME_TYPES];
  },
};
