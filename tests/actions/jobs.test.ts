import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createJobAction,
  setJobStatusAction,
  updateJobAction,
} from "@/lib/actions/jobs";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/dal";
import { resetRateLimits } from "@/lib/rate-limit";
import {
  createTestDocumentType,
  createTestJob,
  createTestRequirement,
  createTestUser,
  formData,
  toCurrentUser,
} from "../harness/fixtures";
import { resetCookies } from "../harness/cookies";
import { expectRedirect } from "../harness/redirect";

vi.mock("@/lib/dal", () => ({ getCurrentUser: vi.fn() }));

const currentUser = vi.mocked(getCurrentUser);

function signIn(user: {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
}): void {
  currentUser.mockResolvedValue(toCurrentUser(user));
}

function jobForm(overrides: Record<string, string> = {}): FormData {
  return formData({
    title: "Senior Software Engineer",
    department: "ICT",
    location: "Dodoma",
    description:
      "Design, build and maintain the recruitment platform services and integrations.",
    qualifications:
      "Bachelor's degree in Computer Science and five years of engineering experience.",
    opensAt: "2026-01-01",
    closesAt: "2026-03-01",
    ...overrides,
  });
}

beforeEach(() => {
  resetCookies();
  resetRateLimits();
  currentUser.mockReset();
});

describe("job creation", () => {
  it("lets a recruiter create a draft job", async () => {
    const recruiter = await createTestUser({ role: "RECRUITER" });
    signIn(recruiter);

    const target = await expectRedirect(createJobAction(undefined, jobForm()));
    const jobId = target.split("/").pop() as string;

    const job = await prisma.job.findUnique({ where: { id: jobId } });
    expect(job).not.toBeNull();
    expect(job?.status).toBe("DRAFT");
    expect(job?.createdById).toBe(recruiter.id);
    expect(job?.recruiterId).toBe(recruiter.id);
  });

  it("publishes immediately when PUBLISHED is requested", async () => {
    const recruiter = await createTestUser({ role: "RECRUITER" });
    signIn(recruiter);

    const target = await expectRedirect(
      createJobAction(undefined, jobForm({ status: "PUBLISHED" })),
    );
    const jobId = target.split("/").pop() as string;

    const job = await prisma.job.findUnique({ where: { id: jobId } });
    expect(job?.status).toBe("PUBLISHED");
  });

  it("allows an administrator to create a job without assigning a recruiter", async () => {
    const admin = await createTestUser({ role: "ADMIN" });
    signIn(admin);

    const target = await expectRedirect(createJobAction(undefined, jobForm()));
    const jobId = target.split("/").pop() as string;

    const job = await prisma.job.findUnique({ where: { id: jobId } });
    expect(job?.createdById).toBe(admin.id);
    expect(job?.recruiterId).toBeNull();
  });

  it("rejects job creation from a candidate", async () => {
    const candidate = await createTestUser({ role: "CANDIDATE" });
    signIn(candidate);

    const before = await prisma.job.count();
    const state = await createJobAction(undefined, jobForm());

    expect(state?.message).toBe(
      "You are not authorized to manage job vacancies.",
    );
    expect(await prisma.job.count()).toBe(before);
  });

  it("rejects job creation when nobody is signed in", async () => {
    currentUser.mockResolvedValue(null);
    const state = await createJobAction(undefined, jobForm());

    expect(state?.message).toBe(
      "You must be signed in to manage job vacancies.",
    );
  });

  it("returns field errors for an invalid job payload", async () => {
    const recruiter = await createTestUser({ role: "RECRUITER" });
    signIn(recruiter);

    const state = await createJobAction(
      undefined,
      jobForm({ title: "x", description: "too short" }),
    );

    expect(state?.errors?.title).toBeDefined();
    expect(state?.errors?.description).toBeDefined();
  });
});

describe("job status transitions", () => {
  it("publishes a draft job", async () => {
    const recruiter = await createTestUser({ role: "RECRUITER" });
    signIn(recruiter);
    const job = await createTestJob({ createdById: recruiter.id, status: "DRAFT" });

    const state = await setJobStatusAction(
      undefined,
      formData({ id: job.id, status: "PUBLISHED" }),
    );

    expect(state?.ok).toBe(true);
    const updated = await prisma.job.findUnique({ where: { id: job.id } });
    expect(updated?.status).toBe("PUBLISHED");
  });

  it("closes a published job", async () => {
    const recruiter = await createTestUser({ role: "RECRUITER" });
    signIn(recruiter);
    const job = await createTestJob({ createdById: recruiter.id, status: "PUBLISHED" });

    const state = await setJobStatusAction(
      undefined,
      formData({ id: job.id, status: "CLOSED" }),
    );

    expect(state?.ok).toBe(true);
    const updated = await prisma.job.findUnique({ where: { id: job.id } });
    expect(updated?.status).toBe("CLOSED");
  });

  it("reopens a closed job", async () => {
    const recruiter = await createTestUser({ role: "RECRUITER" });
    signIn(recruiter);
    const job = await createTestJob({ createdById: recruiter.id, status: "CLOSED" });

    const state = await setJobStatusAction(
      undefined,
      formData({ id: job.id, status: "PUBLISHED" }),
    );

    expect(state?.ok).toBe(true);
    const updated = await prisma.job.findUnique({ where: { id: job.id } });
    expect(updated?.status).toBe("PUBLISHED");
  });

  it("rejects an invalid transition back to draft", async () => {
    const recruiter = await createTestUser({ role: "RECRUITER" });
    signIn(recruiter);
    const job = await createTestJob({ createdById: recruiter.id, status: "PUBLISHED" });

    const state = await setJobStatusAction(
      undefined,
      formData({ id: job.id, status: "DRAFT" }),
    );

    expect(state?.message).toContain("Cannot change a PUBLISHED job to DRAFT");
    const updated = await prisma.job.findUnique({ where: { id: job.id } });
    expect(updated?.status).toBe("PUBLISHED");
  });

  it("rejects an unknown status value", async () => {
    const recruiter = await createTestUser({ role: "RECRUITER" });
    signIn(recruiter);
    const job = await createTestJob({ createdById: recruiter.id });

    const state = await setJobStatusAction(
      undefined,
      formData({ id: job.id, status: "ARCHIVED" }),
    );

    expect(state?.message).toBe("Invalid job status.");
  });
});

describe("job record-level authorization", () => {
  it("stops one recruiter from editing another recruiter's job", async () => {
    const owner = await createTestUser({ role: "RECRUITER" });
    const other = await createTestUser({ role: "RECRUITER" });
    signIn(other);
    const job = await createTestJob({
      createdById: owner.id,
      status: "PUBLISHED",
    });

    const statusState = await setJobStatusAction(
      undefined,
      formData({ id: job.id, status: "CLOSED" }),
    );
    expect(statusState?.message).toBe(
      "You are not authorized to change this job vacancy.",
    );

    const editState = await updateJobAction(
      undefined,
      jobForm({ id: job.id, title: "Hijacked Title" }),
    );
    expect(editState?.message).toBe(
      "You are not authorized to edit this job vacancy.",
    );

    const unchanged = await prisma.job.findUnique({ where: { id: job.id } });
    expect(unchanged?.status).toBe("PUBLISHED");
    expect(unchanged?.title).toBe(job.title);
  });

  it("stops a candidate from editing a job", async () => {
    const recruiter = await createTestUser({ role: "RECRUITER" });
    const candidate = await createTestUser({ role: "CANDIDATE" });
    signIn(candidate);
    const job = await createTestJob({ createdById: recruiter.id });

    const state = await updateJobAction(
      undefined,
      jobForm({ id: job.id, title: "Candidate Edit" }),
    );

    expect(state?.message).toBe(
      "You are not authorized to manage job vacancies.",
    );
    const unchanged = await prisma.job.findUnique({ where: { id: job.id } });
    expect(unchanged?.title).toBe(job.title);
  });

  it("allows an administrator to manage any job", async () => {
    const recruiter = await createTestUser({ role: "RECRUITER" });
    const admin = await createTestUser({ role: "ADMIN" });
    signIn(admin);
    const job = await createTestJob({
      createdById: recruiter.id,
      status: "PUBLISHED",
    });

    const state = await setJobStatusAction(
      undefined,
      formData({ id: job.id, status: "CLOSED" }),
    );

    expect(state?.ok).toBe(true);
    const updated = await prisma.job.findUnique({ where: { id: job.id } });
    expect(updated?.status).toBe("CLOSED");
  });
});

describe("vacancy document requirements", () => {
  it("publishes a vacancy with no document requirements (backward compatible)", async () => {
    const recruiter = await createTestUser({ role: "RECRUITER" });
    signIn(recruiter);

    const target = await expectRedirect(
      createJobAction(undefined, jobForm({ status: "PUBLISHED" })),
    );
    const jobId = target.split("/").pop() as string;

    const job = await prisma.job.findUnique({ where: { id: jobId } });
    expect(job?.status).toBe("PUBLISHED");
    const requirements = await prisma.jobDocumentRequirement.count({
      where: { jobId },
    });
    expect(requirements).toBe(0);
  });

  it("persists required and optional requirements in order on creation", async () => {
    const recruiter = await createTestUser({ role: "RECRUITER" });
    signIn(recruiter);
    const cv = await createTestDocumentType({ name: `CV ${Date.now()}` });
    const licence = await createTestDocumentType({
      name: `Practising licence ${Date.now()}`,
    });

    const target = await expectRedirect(
      createJobAction(
        undefined,
        jobForm({
          documentRequirements: JSON.stringify([
            {
              documentTypeId: cv.id,
              requirementStatus: "REQUIRED",
            },
            {
              documentTypeId: licence.id,
              description: "Must be current.",
              requirementStatus: "OPTIONAL",
            },
            {
              customName: "Referee letters",
              requirementStatus: "REQUIRED",
            },
          ]),
        }),
      ),
    );
    const jobId = target.split("/").pop() as string;

    const requirements = await prisma.jobDocumentRequirement.findMany({
      where: { jobId },
      orderBy: { displayOrder: "asc" },
    });
    expect(requirements).toHaveLength(3);
    expect(requirements[0]).toMatchObject({
      documentTypeId: cv.id,
      requirementStatus: "REQUIRED",
      displayOrder: 0,
    });
    expect(requirements[1]).toMatchObject({
      documentTypeId: licence.id,
      description: "Must be current.",
      requirementStatus: "OPTIONAL",
      displayOrder: 1,
    });
    expect(requirements[2]).toMatchObject({
      documentTypeId: null,
      customName: "Referee letters",
      requirementStatus: "REQUIRED",
      displayOrder: 2,
    });
  });

  it("rejects a requirement that has neither a document type nor a custom name", async () => {
    const recruiter = await createTestUser({ role: "RECRUITER" });
    signIn(recruiter);

    const before = await prisma.job.count();
    const state = await createJobAction(
      undefined,
      jobForm({
        documentRequirements: JSON.stringify([
          { requirementStatus: "REQUIRED" },
        ]),
      }),
    );

    expect(state?.errors?.documentRequirements).toBeDefined();
    expect(await prisma.job.count()).toBe(before);
  });

  it("rejects a requirement referencing an unknown document type", async () => {
    const recruiter = await createTestUser({ role: "RECRUITER" });
    signIn(recruiter);

    const before = await prisma.job.count();
    const state = await createJobAction(
      undefined,
      jobForm({
        documentRequirements: JSON.stringify([
          { documentTypeId: "does-not-exist", requirementStatus: "REQUIRED" },
        ]),
      }),
    );

    expect(state?.errors?.documentRequirements).toBeDefined();
    expect(await prisma.job.count()).toBe(before);
  });

  it("rejects a malformed document requirements payload", async () => {
    const recruiter = await createTestUser({ role: "RECRUITER" });
    signIn(recruiter);

    const before = await prisma.job.count();
    const state = await createJobAction(
      undefined,
      jobForm({ documentRequirements: "{not-json" }),
    );

    expect(state?.errors?.documentRequirements).toBeDefined();
    expect(await prisma.job.count()).toBe(before);
  });

  it("reconciles requirements on update: keeps, removes, reorders and adds", async () => {
    const recruiter = await createTestUser({ role: "RECRUITER" });
    signIn(recruiter);
    const job = await createTestJob({ createdById: recruiter.id });
    const first = await createTestRequirement({
      jobId: job.id,
      customName: "First",
      displayOrder: 0,
    });
    const second = await createTestRequirement({
      jobId: job.id,
      customName: "Second",
      displayOrder: 1,
    });
    const third = await createTestRequirement({
      jobId: job.id,
      customName: "Third",
      displayOrder: 2,
    });

    await expectRedirect(
      updateJobAction(
        undefined,
        jobForm({
          id: job.id,
          documentRequirements: JSON.stringify([
            { id: second.id, customName: "Second", requirementStatus: "OPTIONAL" },
            { id: first.id, customName: "First", requirementStatus: "REQUIRED" },
            { customName: "Fourth", requirementStatus: "REQUIRED" },
          ]),
        }),
      ),
    );

    const requirements = await prisma.jobDocumentRequirement.findMany({
      where: { jobId: job.id },
      orderBy: { displayOrder: "asc" },
    });
    expect(requirements.map((row) => row.id)).toContain(first.id);
    expect(requirements.map((row) => row.id)).toContain(second.id);
    expect(requirements.map((row) => row.id)).not.toContain(third.id);

    expect(requirements.map((row) => row.customName)).toEqual([
      "Second",
      "First",
      "Fourth",
    ]);
    expect(requirements[0].requirementStatus).toBe("OPTIONAL");
    expect(requirements[1].requirementStatus).toBe("REQUIRED");
  });

  it("removes all requirements when the submitted list is empty", async () => {
    const recruiter = await createTestUser({ role: "RECRUITER" });
    signIn(recruiter);
    const job = await createTestJob({ createdById: recruiter.id });
    await createTestRequirement({ jobId: job.id, customName: "Only one" });

    await expectRedirect(
      updateJobAction(
        undefined,
        jobForm({ id: job.id, documentRequirements: "[]" }),
      ),
    );

    const count = await prisma.jobDocumentRequirement.count({
      where: { jobId: job.id },
    });
    expect(count).toBe(0);
  });
});
