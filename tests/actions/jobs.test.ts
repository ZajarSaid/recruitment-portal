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
  createTestJob,
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
    category: "IT",
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
    expect(job?.category).toBe("IT");
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
