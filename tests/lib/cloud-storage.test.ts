import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  deleteStoredUpload,
  fromCloudReference,
  isCloudReference,
  resolveStoredUpload,
  storeUploadedFile,
  toCloudReference,
  usesCloudStorage,
} from "@/lib/cloud-storage";

/**
 * These tests run without Cloudinary credentials, so the storage abstraction
 * takes its local fallback path. The cloud reference helpers are pure and are
 * exercised directly.
 */

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

    const resolved = await resolveStoredUpload(stored.reference, stored.url);
    expect(resolved.kind).toBe("buffer");
    if (resolved.kind === "buffer") {
      expect(resolved.buffer).toEqual(PNG_BYTES);
    }

    await deleteStoredUpload(stored.reference);
    await expect(
      resolveStoredUpload(stored.reference, stored.url),
    ).rejects.toThrow();
  });

  it("resolves a cloud reference by URL without touching disk", async () => {
    const resolved = await resolveStoredUpload(
      toCloudReference("docs/x"),
      "https://res.cloudinary.com/demo/image/upload/docs/x.png",
    );
    expect(resolved).toEqual({
      kind: "redirect",
      url: "https://res.cloudinary.com/demo/image/upload/docs/x.png",
    });
  });

  it("throws when a cloud reference has no URL", async () => {
    await expect(
      resolveStoredUpload(toCloudReference("docs/x"), null),
    ).rejects.toThrow();
  });
});
