import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  deleteStoredUpload,
  fromCloudReference,
  isCloudReference,
  resolveStoredUpload,
  storeUploadedFile,
  toCloudReference,
  usesCloudStorage,
} from "@/lib/cloud-storage";
import { signedDocumentUrl } from "@/lib/cloudinary";
import { serveStoredDocument } from "@/lib/document-response";

vi.mock("@/lib/cloudinary", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/cloudinary")>(),
  signedDocumentUrl: vi.fn(() => "https://api.cloudinary.com/signed-document"),
}));

/**
 * These tests run without Cloudinary credentials, so the storage abstraction
 * takes its local fallback path. The cloud reference helpers are pure and are
 * exercised directly.
 *
 * The developer `.env` may contain real Cloudinary credentials; the module
 * captures them at import time, so they are removed before the import runs.
 */
const { cloudinaryEnv, savedEnv } = vi.hoisted(() => {
  const names = [
    "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME",
    "NEXT_PUBLIC_CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
  ] as const;
  const saved: Record<string, string | undefined> = {};
  for (const name of names) {
    saved[name] = process.env[name];
    delete process.env[name];
  }
  return { cloudinaryEnv: names, savedEnv: saved };
});

afterAll(() => {
  for (const name of cloudinaryEnv) {
    const value = savedEnv[name];
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

const PNG_BYTES = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01,
]);

let originalUploadDir: string | undefined;

beforeAll(() => {
  originalUploadDir = process.env.UPLOAD_DIR;
});

afterAll(() => {
  if (originalUploadDir === undefined) delete process.env.UPLOAD_DIR;
  else process.env.UPLOAD_DIR = originalUploadDir;
});

describe("cloud reference helpers", () => {
  it("round-trips a public id through the cloud prefix", () => {
    const reference = toCloudReference("profile-photos/u1/abc");
    expect(reference).toBe("cloud:profile-photos/u1/abc");
    expect(isCloudReference(reference)).toBe(true);
    expect(fromCloudReference(reference)).toBe("profile-photos/u1/abc");
  });

  it("treats a plain storage key as local", () => {
    expect(isCloudReference("documents/u1/file.png")).toBe(false);
  });
});

describe("storeUploadedFile (local fallback)", () => {
  it("falls back to local storage when Cloudinary is not configured", async () => {
    expect(usesCloudStorage()).toBe(false);

    const stored = await storeUploadedFile(PNG_BYTES, {
      folder: "documents/test-user",
      mimeType: "image/png",
    });

    expect(stored.backend).toBe("local");
    expect(stored.url).toBeNull();
    expect(isCloudReference(stored.reference)).toBe(false);
    expect(stored.reference).toMatch(/^documents\/test-user\/[0-9a-f-]+\.png$/);

    expect(await resolveStoredUpload(stored.reference, stored.url, "image/png")).toEqual(PNG_BYTES);

    await deleteStoredUpload(stored.reference);
    await expect(
      resolveStoredUpload(stored.reference, stored.url, "image/png"),
    ).rejects.toThrow();
  });

  it("throws when a cloud reference has no URL", async () => {
    await expect(
      resolveStoredUpload(toCloudReference("docs/x"), null, "application/pdf"),
    ).rejects.toThrow();
  });
});

describe("serving a cloud document", () => {
  const document = {
    storageKey: toCloudReference("docs/x"),
    cloudUrl: "https://res.cloudinary.com/demo/image/upload/docs/x.pdf",
    originalFileName: "certificate.pdf",
    mimeType: "application/pdf",
  };

  it("returns the signed file bytes inline or as a download", async () => {
    const pdf = "%PDF-1.7\n";
    const fetchAsset = vi.spyOn(globalThis, "fetch").mockImplementation(async () => new Response(pdf));
    try {
      const preview = await serveStoredDocument(document);
      expect(preview.status).toBe(200);
      expect(preview.headers.get("content-type")).toBe("application/pdf");
      expect(preview.headers.get("content-disposition")).toBe('inline; filename="certificate.pdf"');
      expect(preview.headers.get("cache-control")).toBe("private, no-store");
      expect(await preview.text()).toBe(pdf);
      expect(signedDocumentUrl).toHaveBeenCalledWith("docs/x", document.cloudUrl, "pdf");
      expect(fetchAsset).toHaveBeenCalledWith("https://api.cloudinary.com/signed-document", expect.any(Object));

      const download = await serveStoredDocument(document, true);
      expect(download.headers.get("content-disposition")).toBe('attachment; filename="certificate.pdf"');
    } finally {
      fetchAsset.mockRestore();
    }
  });

  it("does not deliver provider error JSON as a document", async () => {
    const fetchAsset = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({ error: "Private provider error" }, { status: 401 }))
      .mockResolvedValueOnce(Response.json({ error: "Private provider error" }));
    try {
      for (let attempt = 0; attempt < 2; attempt++) {
        const response = await serveStoredDocument(document);
        expect(response.status).toBe(502);
        expect(await response.text()).toBe("The document could not be loaded. Please try again.");
      }
    } finally {
      fetchAsset.mockRestore();
    }
  });
});
