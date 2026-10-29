import { describe, expect, it } from "vitest";

import { getCandidateApplicationStatus } from "@/lib/applications";
import { prisma } from "@/lib/db";
import {
  createTestApplication,
  createTestJob,
  createTestUser,
} from "../harness/fixtures";

async function setup(
  status: "SUBMITTED" | "UNDER_REVIEW" | "SHORTLISTED" | "REJECTED" = "SUBMITTED",
) {
  const recruiter = await createTestUser({ role: "RECRUITER" });
  const candidate = await createTestUser({ role: "CANDIDATE" });
  const job = await createTestJob({ createdById: recruiter.id });
  const application = await createTestApplication({
    candidateId: candidate.id,
    jobId: job.id,
    status,
  });
  return { recruiter, candidate, job, application };
}

describe("getCandidateApplicationStatus", () => {
  it("returns the job title and current status for the owning candidate", async () => {
    const { candidate, job, application } = await setup("SHORTLISTED");

    const result = await getCandidateApplicationStatus(
      application.id,
      candidate.id,
    );

    expect(result).toEqual({
      id: application.id,
      status: "SHORTLISTED",
      jobTitle: job.title,
      rejectionReason: null,
    });
  });

  it("returns null when the application belongs to a different candidate", async () => {
    const { application } = await setup();
    const other = await createTestUser({ role: "CANDIDATE" });

    expect(
      await getCandidateApplicationStatus(application.id, other.id),
    ).toBeNull();
  });

  it("returns null for an unknown application id", async () => {
    const candidate = await createTestUser({ role: "CANDIDATE" });

    expect(
      await getCandidateApplicationStatus("does-not-exist", candidate.id),
    ).toBeNull();
  });

  it("surfaces the most recent rejection reason when rejected", async () => {
    const { recruiter, candidate, application } = await setup("REJECTED");

    await prisma.applicationStatusHistory.create({
      data: {
        applicationId: application.id,
        fromStatus: "SUBMITTED",
        toStatus: "REJECTED",
        actorId: recruiter.id,
        note: "Earlier reason",
        createdAt: new Date(Date.now() - 60_000),
      },
    });
    await prisma.applicationStatusHistory.create({
      data: {
        applicationId: application.id,
        fromStatus: "REJECTED",
        toStatus: "REJECTED",
        actorId: recruiter.id,
        note: "Most recent reason",
        createdAt: new Date(),
      },
    });

    const result = await getCandidateApplicationStatus(
      application.id,
      candidate.id,
    );

    expect(result?.status).toBe("REJECTED");
    expect(result?.rejectionReason).toBe("Most recent reason");
  });

  it("returns a null reason when rejected without a note", async () => {
    const { recruiter, candidate, application } = await setup("REJECTED");

    await prisma.applicationStatusHistory.create({
      data: {
        applicationId: application.id,
        fromStatus: "SUBMITTED",
        toStatus: "REJECTED",
        actorId: recruiter.id,
        note: null,
      },
    });

    const result = await getCandidateApplicationStatus(
      application.id,
      candidate.id,
    );

    expect(result?.rejectionReason).toBeNull();
  });

  it("does not surface history notes while the application is not rejected", async () => {
    const { recruiter, candidate, application } = await setup("UNDER_REVIEW");

    await prisma.applicationStatusHistory.create({
      data: {
        applicationId: application.id,
        fromStatus: "SUBMITTED",
        toStatus: "REJECTED",
        actorId: recruiter.id,
        note: "An earlier rejection that was later reversed",
      },
    });

    const result = await getCandidateApplicationStatus(
      application.id,
      candidate.id,
    );

    expect(result?.rejectionReason).toBeNull();
  });
});
