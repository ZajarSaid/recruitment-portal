import { expect, it, vi } from "vitest";
import { GET } from "@/app/profile/photo/route";

const { findUnique, readStoredFile } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  readStoredFile: vi.fn(),
}));

vi.mock("@/lib/dal", () => ({
  requireRole: async () => ({ id: "candidate-one" }),
}));
vi.mock("@/lib/db", () => ({ prisma: { candidateProfile: { findUnique } } }));
vi.mock("@/lib/uploads", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/uploads")>()),
  readStoredFile,
}));

it("serves a saved local photo only from the signed-in candidate’s folder", async () => {
  const file = "618d86ac-aadc-4b17-a56d-69d60ad40156.jpg";
  findUnique.mockResolvedValueOnce({ photoPublicId: `profile-photos/candidate-one/${file}` });
  readStoredFile.mockResolvedValueOnce(Buffer.from([0xff, 0xd8, 0xff, 0xe0]));
  const response = await GET();
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toBe("image/jpeg");
  expect(findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "candidate-one" } }));

  findUnique.mockResolvedValueOnce({ photoPublicId: `profile-photos/candidate-two/${file}` });
  expect((await GET()).status).toBe(404);
  expect(readStoredFile).toHaveBeenCalledTimes(1);
});
