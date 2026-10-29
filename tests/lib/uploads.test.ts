import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  buildStorageKey,
  deleteStoredFile,
  detectMimeType,
  readStoredFile,
  resolveStoragePath,
  sanitizeFileName,
  validateImageUpload,
  validateUpload,
  writeStoredFile,
} from "@/lib/uploads";
import { TEST_PDF_BYTES, testFile } from "../harness/fixtures";

const PNG_BYTES = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01,
]);
const JPEG_BYTES = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
const HTML_BYTES = Buffer.from("<!DOCTYPE html><html><body>hi</body></html>");

let uploadDir: string;

beforeAll(async () => {
  uploadDir = await mkdtemp(path.join(tmpdir(), "uploads-test-"));
  process.env.UPLOAD_DIR = uploadDir;
});

afterAll(async () => {
  await rm(uploadDir, { recursive: true, force: true });
  delete process.env.UPLOAD_DIR;
});

describe("file type detection", () => {
  it("detects PDF, JPEG, and PNG from magic bytes", () => {
    expect(detectMimeType(TEST_PDF_BYTES)).toBe("application/pdf");
    expect(detectMimeType(JPEG_BYTES)).toBe("image/jpeg");
    expect(detectMimeType(PNG_BYTES)).toBe("image/png");
  });

  it("returns null for content it does not recognise", () => {
    expect(detectMimeType(HTML_BYTES)).toBeNull();
    expect(detectMimeType(Buffer.alloc(0))).toBeNull();
  });
});

describe("filename sanitisation", () => {
  it("strips directory components from a name", () => {
    expect(sanitizeFileName("../../etc/passwd")).toBe("passwd");
    expect(sanitizeFileName("C:\\Users\\me\\cv.pdf")).toBe("cv.pdf");
  });

  it("replaces characters that are unsafe in a filename", () => {
    expect(sanitizeFileName('cv<final>:v2"copy".pdf')).toBe(
      "cv_final__v2_copy_.pdf",
    );
  });

  it("never returns an empty name", () => {
    expect(sanitizeFileName("")).toBe("document");
    expect(sanitizeFileName("   ")).toBe("document");
  });
});

describe("upload validation", () => {
  it("accepts a well-formed PDF", async () => {
    const result = await validateUpload(testFile(TEST_PDF_BYTES));
    expect(result).toMatchObject({
      ok: true,
      mimeType: "application/pdf",
      fileSize: TEST_PDF_BYTES.length,
      originalFileName: "cv.pdf",
    });
  });

  it("rejects an empty file", async () => {
    const result = await validateUpload(testFile(Buffer.alloc(0)));
    expect(result).toEqual({
      ok: false,
      message: "The uploaded file is empty.",
    });
  });

  it("rejects content that does not match any allowed type", async () => {
    const result = await validateUpload(testFile(HTML_BYTES));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/Unsupported file type/);
    }
  });

  it("ignores the declared MIME type and uses the file's content", async () => {
    const result = await validateUpload(
      testFile(HTML_BYTES, { name: "cv.pdf", type: "application/pdf" }),
    );
    expect(result.ok).toBe(false);
  });

  it("rejects a file larger than the configured maximum", async () => {
    process.env.UPLOAD_MAX_FILE_SIZE_BYTES = "10";
    try {
      const result = await validateUpload(testFile(TEST_PDF_BYTES));
      expect(result).toEqual({
        ok: false,
        message: "File is too large. The maximum size is 10 B.",
      });
    } finally {
      delete process.env.UPLOAD_MAX_FILE_SIZE_BYTES;
    }
  });

  it("rejects a valid file whose type is not on the allow-list", async () => {
    process.env.UPLOAD_ALLOWED_MIME_TYPES = "image/png";
    try {
      const result = await validateUpload(testFile(TEST_PDF_BYTES));
      expect(result).toEqual({
        ok: false,
        message: "This file type is not allowed for upload.",
      });
    } finally {
      delete process.env.UPLOAD_ALLOWED_MIME_TYPES;
    }
  });
});

describe("profile image validation", () => {
  it("accepts a JPEG image", async () => {
    const result = await validateImageUpload(
      testFile(JPEG_BYTES, { name: "photo.jpg", type: "image/jpeg" }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.mimeType).toBe("image/jpeg");
  });

  it("accepts a PNG image", async () => {
    const result = await validateImageUpload(
      testFile(PNG_BYTES, { name: "photo.png", type: "image/png" }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.mimeType).toBe("image/png");
  });

  it("rejects a PDF even though PDFs are allowed for documents", async () => {
    const result = await validateImageUpload(testFile(TEST_PDF_BYTES));
    expect(result).toEqual({
      ok: false,
      message: "The profile photo must be a JPEG or PNG image.",
    });
  });
});

describe("private storage", () => {
  it("round-trips a file through write, read, and delete", async () => {
    const key = buildStorageKey("documents/test-user", "application/pdf");
    expect(key).toMatch(/^documents\/test-user\/[0-9a-f-]+\.pdf$/);

    await writeStoredFile(key, TEST_PDF_BYTES);
    expect(await readStoredFile(key)).toEqual(TEST_PDF_BYTES);

    await deleteStoredFile(key);
    await expect(readStoredFile(key)).rejects.toThrow();
  });

  it("stores files under the configured directory, not public/", async () => {
    const key = buildStorageKey("documents/test-user", "application/pdf");
    await writeStoredFile(key, TEST_PDF_BYTES);
    try {
      const resolved = resolveStoragePath(key);
      expect(resolved.startsWith(path.resolve(uploadDir))).toBe(true);
      expect(resolved.includes(`${path.sep}public${path.sep}`)).toBe(false);
    } finally {
      await deleteStoredFile(key);
    }
  });

  it("rejects a storage key that escapes the upload directory", () => {
    expect(() => resolveStoragePath("documents/../../outside.pdf")).toThrow(
      "Invalid storage key.",
    );
    expect(() => resolveStoragePath("/etc/passwd")).toThrow(
      "Invalid storage key.",
    );
  });

  it("tolerates deleting a file that does not exist", async () => {
    await expect(
      deleteStoredFile("documents/does-not-exist/file.pdf"),
    ).resolves.toBeUndefined();
  });
});
