import { beforeEach, describe, expect, it, vi } from "vitest";

import { updateApplicationStatusAction } from "@/lib/actions/recruiter";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/dal";
import { resetRateLimits } from "@/lib/rate-limit";
import {
  createTestApplication,
  createTestJob,
  createTestUser,
  formData,
  toCurrentUser,
} from "../harness/fixtures";
import { resetCookies } from "../harness/cookies";

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

async function seedScenario() {
  const owner = await createTestUser({ role: "RECRUITER", name: "Job Owner" });
  const candidate = await createTestUser({ role: "CANDIDATE", name: "Applicant" });
  const job = await createTestJob({ createdById: owner.id, status: "PUBLISHED" });
  const application = await createTestApplication({
    candidateId: candidate.id,
    jobId: job.id,
  });
  return { owner, candidate, job, application };
}

function statusForm(
  applicationId: string,
  toStatus: string,
  note?: string,
): FormData {
  const data = formData({ applicationId, toStatus });
  if (note !== undefined) {
    data.set("note", note);
  }
  return data;
}

beforeEach(() => {
  resetCookies();
  resetRateLimits();
  currentUser.mockReset();
});

describe("valid status transitions", () => {
  it("moves SUBMITTED to UNDER_REVIEW and records history", async () => {
    const { owner, application } = await seedScenario();
    signIn(owner);

    const state = await updateApplicationStatusAction(
      undefined,
      statusForm(application.id, "UNDER_REVIEW", "Checking documents"),
    );

    expect(state?.ok).toBe(true);
    expect(state?.message).toBe("Status updated to UNDER_REVIEW.");

    const updated = await prisma.application.findUnique({
      where: { id: application.id },
      include: { history: true },
    });
    expect(updated?.status).toBe("UNDER_REVIEW");
    expect(updated?.history).toHaveLength(1);
    expect(updated?.history[0].fromStatus).toBe("SUBMITTED");
    expect(updated?.history[0].toStatus).toBe("UNDER_REVIEW");
    expect(updated?.history[0].actorId).toBe(owner.id);
    expect(updated?.history[0].note).toBe("Checking documents");
  });

  it("supports the full lifecycle through to a decision", async () => {
    const { owner, application } = await seedScenario();
    signIn(owner);

    await updateApplicationStatusAction(
      undefined,
      statusForm(application.id, "SHORTLISTED"),
    );
    const state = await updateApplicationStatusAction(
      undefined,
      statusForm(application.id, "UNDER_REVIEW"),
    );
    const rejected = await updateApplicationStatusAction(
      undefined,
      statusForm(application.id, "REJECTED", "Not a fit"),
    );

    expect(state?.ok).toBe(true);
    expect(rejected?.ok).toBe(true);

    const updated = await prisma.application.findUnique({
      where: { id: application.id },
      include: { history: { orderBy: { createdAt: "asc" } } },
    });
    expect(updated?.status).toBe("REJECTED");
    expect(updated?.history.map((entry) => entry.toStatus)).toEqual([
      "SHORTLISTED",
      "UNDER_REVIEW",
      "REJECTED",
    ]);
  });

  it("allows an administrator to decide on any application", async () => {
    const admin = await createTestUser({ role: "ADMIN" });
    const { application } = await seedScenario();
    signIn(admin);

    const state = await updateApplicationStatusAction(
      undefined,
      statusForm(application.id, "REJECTED"),
    );

    expect(state?.ok).toBe(true);
    const updated = await prisma.application.findUnique({
      where: { id: application.id },
    });
    expect(updated?.status).toBe("REJECTED");
  });
});

describe("invalid status transitions", () => {
  it("rejects moving an application back to SUBMITTED", async () => {
    const { owner, application } = await seedScenario();
    await prisma.application.update({
      where: { id: application.id },
      data: { status: "UNDER_REVIEW" },
    });
    signIn(owner);

    const state = await updateApplicationStatusAction(
      undefined,
      statusForm(application.id, "SUBMITTED"),
    );

    expect(state?.message).toBe(
      "Cannot transition from UNDER_REVIEW to SUBMITTED.",
    );
    const updated = await prisma.application.findUnique({
      where: { id: application.id },
    });
    expect(updated?.status).toBe("UNDER_REVIEW");
  });

  it("rejects an unknown target status", async () => {
    const { owner, application } = await seedScenario();
    signIn(owner);

    const state = await updateApplicationStatusAction(
      undefined,
      statusForm(application.id, "HIRED"),
    );

    expect(state?.errors?.toStatus).toBeDefined();
    const updated = await prisma.application.findUnique({
      where: { id: application.id },
    });
    expect(updated?.status).toBe("SUBMITTED");
  });

  it("reports a missing application", async () => {
    const { owner } = await seedScenario();
    signIn(owner);

    const state = await updateApplicationStatusAction(
      undefined,
      statusForm("no-such-application", "SHORTLISTED"),
    );

    expect(state?.message).toBe("Application not found.");
  });
});

describe("record-level authorization for status changes", () => {
  it("stops a candidate from changing their own application status", async () => {
    const { candidate, application } = await seedScenario();
    signIn(candidate);

    const state = await updateApplicationStatusAction(
      undefined,
      statusForm(application.id, "SHORTLISTED"),
    );

    expect(state?.message).toBe("Not authorized");
    const updated = await prisma.application.findUnique({
      where: { id: application.id },
    });
    expect(updated?.status).toBe("SUBMITTED");
  });

  it("stops an unrelated recruiter from deciding on another recruiter's job", async () => {
    const { application } = await seedScenario();
    const intruder = await createTestUser({ role: "RECRUITER" });
    signIn(intruder);

    const state = await updateApplicationStatusAction(
      undefined,
      statusForm(application.id, "REJECTED"),
    );

    expect(state?.message).toBe(
      "Not authorized to manage this application.",
    );
    const updated = await prisma.application.findUnique({
      where: { id: application.id },
    });
    expect(updated?.status).toBe("SUBMITTED");
  });

  it("stops an anonymous request", async () => {
    currentUser.mockResolvedValue(null);
    const { application } = await seedScenario();

    const state = await updateApplicationStatusAction(
      undefined,
      statusForm(application.id, "SHORTLISTED"),
    );

    expect(state?.message).toBe("Not authenticated");
  });

  it("lets the assigned recruiter decide", async () => {
    const { application } = await seedScenario();
    const recruiter = await createTestUser({ role: "RECRUITER" });
    await prisma.job.update({
      where: { id: application.jobId },
      data: { recruiterId: recruiter.id },
    });
    signIn(recruiter);

    const state = await updateApplicationStatusAction(
      undefined,
      statusForm(application.id, "SHORTLISTED"),
    );

    expect(state?.ok).toBe(true);
    const updated = await prisma.application.findUnique({
      where: { id: application.id },
    });
    expect(updated?.status).toBe("SHORTLISTED");
  });
});
