import { beforeEach, describe, expect, it, vi } from "vitest";

import { uploadProfilePhotoAction } from "@/lib/actions/profile-photo";
import { getCurrentUser } from "@/lib/dal";
import { createTestUser, toCurrentUser } from "../harness/fixtures";

/**
 * The profile-photo action is exercised with the storage layer mocked so no
 * network or disk access occurs. We assert the validation and forwarding rules.
 */

const { storeUploadedFileMock } = vi.hoisted(() => ({
  storeUploadedFileMock: vi.fn(),
}));

vi.mock("@/lib/cloud-storage", () => ({
  storeUploadedFile: storeUploadedFileMock,
}));

vi.mock("@/lib/dal", () => ({ getCurrentUser: vi.fn() }));
const currentUser = vi.mocked(getCurrentUser);

const JPEG_BYTES = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);

function formDataWithFile(file: File): FormData {
  const data = new FormData() as unknown as FormData;
  data.set("file", file);
  return data;
}

function imageFile(
  content = JPEG_BYTES,
  { name = "me.jpg", type = "image/jpeg" } = {},
): File {
  return new File([Uint8Array.from(content)], name, { type });
}

beforeEach(() => {
  storeUploadedFileMock.mockReset();
  currentUser.mockReset();
});

describe("uploadProfilePhotoAction", () => {
  it("uploads a valid image and returns its reference and URL", async () => {
    const candidate = await createTestUser({ role: "CANDIDATE" });
    currentUser.mockResolvedValue(toCurrentUser(candidate));
    storeUploadedFileMock.mockResolvedValue({
      reference: "cloud:profile-photos/x/me",
      url: "https://res.cloudinary.com/demo/image/upload/profile-photos/x/me.jpg",
      backend: "cloud",
    });

    const result = await uploadProfilePhotoAction(
      undefined,
      formDataWithFile(imageFile()),
    );

    expect(result?.ok).toBe(true);
    if (result?.ok) {
      expect(result.publicId).toBe("cloud:profile-photos/x/me");
      expect(result.url).toMatch(/res\.cloudinary\.com/);
      expect(result.mimeType).toBe("image/jpeg");
    }
    expect(storeUploadedFileMock).toHaveBeenCalledTimes(1);
  });

  it("rejects a non-image file without storing anything", async () => {
    const candidate = await createTestUser({ role: "CANDIDATE" });
    currentUser.mockResolvedValue(toCurrentUser(candidate));

    const pdf = new File(
      [Uint8Array.from(Buffer.from("%PDF-1.7\n1 0 obj\n%%EOF\n", "latin1"))],
      "cv.pdf",
      { type: "application/pdf" },
    );

    const result = await uploadProfilePhotoAction(undefined, formDataWithFile(pdf));
    expect(result?.ok).toBe(false);
    if (result && !result.ok) {
      expect(result.message).toMatch(/JPEG or PNG/);
    }
    expect(storeUploadedFileMock).not.toHaveBeenCalled();
  });

  it("requires authentication", async () => {
    currentUser.mockResolvedValue(null);
    const result = await uploadProfilePhotoAction(
      undefined,
      formDataWithFile(imageFile()),
    );
    expect(result?.ok).toBe(false);
    expect(storeUploadedFileMock).not.toHaveBeenCalled();
  });
});
