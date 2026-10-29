import { beforeEach, describe, expect, it, vi } from "vitest";

import { uploadFile } from "@/lib/actions/upload";
import { validateUpload } from "@/lib/uploads";

/**
 * The Cloudinary side of `uploadFile` is mocked: we assert the action
 * validates the incoming file and forwards the correct buffer/options, without
 * making a real network upload.
 */
const { uploadBufferMock } = vi.hoisted(() => ({
  uploadBufferMock: vi.fn(),
}));

vi.mock("@/lib/cloudinary", () => ({
  default: {},
  uploadBuffer: uploadBufferMock,
}));

const UPLOAD_RESULT = {
  secure_url: "https://res.cloudinary.com/demo/image/upload/uploads/cv.pdf",
  public_id: "uploads/cv",
};

function formDataWithFile(file: File): FormData {
  const data = new FormData() as unknown as FormData;
  data.set("file", file);
  return data;
}

function pdfFile(content = "%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF\n"): File {
  return new File([Uint8Array.from(Buffer.from(content, "latin1"))], "cv.pdf", {
    type: "application/pdf",
  });
}

beforeEach(() => {
  uploadBufferMock.mockReset();
});

describe("uploadFile", () => {
  it("validates the file and streams it to Cloudinary", async () => {
    uploadBufferMock.mockResolvedValue(UPLOAD_RESULT);
    const file = pdfFile();

    const result = await uploadFile(formDataWithFile(file));

    expect(result).toBe(UPLOAD_RESULT);
    expect(uploadBufferMock).toHaveBeenCalledTimes(1);

    const [buffer, options] = uploadBufferMock.mock.calls[0];
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(options).toEqual({ folder: "uploads" });
  });

  it("rejects a missing file without calling Cloudinary", async () => {
    await expect(uploadFile(new FormData())).rejects.toThrow(/No file/);
    expect(uploadBufferMock).not.toHaveBeenCalled();
  });

  it("rejects an unsupported file type without calling Cloudinary", async () => {
    const html = new File([Buffer.from("<html></html>")], "page.html", {
      type: "text/html",
    });

    await expect(uploadFile(formDataWithFile(html))).rejects.toThrow(
      /Unsupported file type/,
    );
    expect(uploadBufferMock).not.toHaveBeenCalled();
  });

  it("applies the same validation as the local upload pipeline", async () => {
    const file = pdfFile();

    const validation = await validateUpload(file);
    expect(validation.ok).toBe(true);
    if (validation.ok) {
      expect(validation.mimeType).toBe("application/pdf");
    }

    uploadBufferMock.mockResolvedValue(UPLOAD_RESULT);
    await uploadFile(formDataWithFile(file));

    const [forwardedBuffer] = uploadBufferMock.mock.calls[0];
    if (validation.ok) {
      expect(forwardedBuffer).toEqual(validation.buffer);
    }
  });

  it("propagates a Cloudinary failure", async () => {
    uploadBufferMock.mockRejectedValue(new Error("cloudinary down"));

    await expect(uploadFile(formDataWithFile(pdfFile()))).rejects.toThrow(
      "cloudinary down",
    );
  });
});
