import { beforeEach, describe, expect, it, vi } from "vitest";

import { applyToJobAction } from "@/lib/actions/applications";
import { uploadStagedDocumentAction } from "@/lib/actions/documents";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/dal";
import { evaluateResume } from "@/lib/evaluation";
import { resetRateLimits } from "@/lib/rate-limit";
import { APPLICATION_LETTER_KEY } from "@/lib/profile-documents";
import {
  createTestJob,
  createTestProfile,
  createTestUser,
  formData,
  testFile,
  toCurrentUser,
} from "../harness/fixtures";
import { resetCookies } from "../harness/cookies";
import { expectRedirect } from "../harness/redirect";

vi.mock("@/lib/dal", () => ({ getCurrentUser: vi.fn() }));

const currentUser = vi.mocked(getCurrentUser);

const GOOD_RESUME =
  "Bachelor's degree in Computer Science with 8 years of experience. " +
  "Proficient in TypeScript and PostgreSQL. Skills include system design, " +
  "testing and mentoring. " +
  "- Led a team of engineers\n- Delivered multiple projects";

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

function applyForm(jobId: string, resumeSummary = GOOD_RESUME): FormData {
  return formData({ jobId, resumeSummary });
}

/** Stages the mandatory application letter for a candidate/job pair. */
async function stageLetter(candidateId: string, jobId: string) {
  currentUser.mockResolvedValue(
    toCurrentUser(await prisma.user.findUniqueOrThrow({ where: { id: candidateId } })),
  );
  const upload = formData({ jobId, documentKey: APPLICATION_LETTER_KEY });
  upload.set("file", testFile());
  const state = await uploadStagedDocumentAction(undefined, upload);
  expect(state?.ok).toBe(true);
}

/** Gives a candidate a complete master profile and a staged letter. */
async function prepareCandidate(
  candidateId: string,
  jobId: string,
): Promise<void> {
  await createTestProfile({ userId: candidateId });
  await stageLetter(candidateId, jobId);
}

beforeEach(() => {
  resetCookies();
  resetRateLimits();
  currentUser.mockReset();
});

describe("submitting an application", () => {
  it("requires a score above 60% and a saved NIDA number", async () => {
    const recruiter = await createTestUser({ role: "RECRUITER" });
    const candidate = await createTestUser();
    const job = await createTestJob({ createdById: recruiter.id });
    const profile = await createTestProfile({ userId: candidate.id });
    await prisma.candidateProfile.update({
      where: { id: profile.id },
      data: { languages: null, computerLiteracy: null },
    });
    await stageLetter(candidate.id, job.id);

    expect(await applyToJobAction(undefined, applyForm(job.id))).toMatchObject({
      message: "Your profile is 60% complete. It must be above 60% to apply.",
    });
    await prisma.candidateProfile.update({
      where: { id: profile.id },
      data: { languages: "Kiswahili", nidaNumber: null },
    });
    expect(await applyToJobAction(undefined, applyForm(job.id))).toMatchObject({
      message: "Add your NIDA number in Personal details before applying.",
    });
    await prisma.candidateProfile.update({
      where: { id: profile.id },
      data: { nidaNumber: "00000000000000000000" },
    });
    expect(await expectRedirect(applyToJobAction(undefined, applyForm(job.id)))).toBe("/dashboard");
  });
  it("creates the application, evaluation, and initial history entry", async () => {
    const recruiter = await createTestUser({ role: "RECRUITER" });
    const candidate = await createTestUser({ role: "CANDIDATE" });
    const job = await createTestJob({ createdById: recruiter.id, status: "PUBLISHED" });
    signIn(candidate);
    await prepareCandidate(candidate.id, job.id);

    const target = await expectRedirect(applyToJobAction(undefined, applyForm(job.id)));
    expect(target).toBe("/dashboard");

    const application = await prisma.application.findUnique({
      where: { candidateId_jobId: { candidateId: candidate.id, jobId: job.id } },
      include: { evaluation: true, history: true },
    });

    expect(application).not.toBeNull();
    expect(application?.status).toBe("SUBMITTED");
    expect(application?.resumeSummary).toBe(GOOD_RESUME);

    expect(application?.evaluation).not.toBeNull();
    expect(application?.evaluation?.method).toBe("deterministic-rule-v1");
    expect(application?.evaluation?.score).toBe(evaluateResume(GOOD_RESUME).score);

    expect(application?.history).toHaveLength(1);
    expect(application?.history[0].fromStatus).toBeNull();
    expect(application?.history[0].toStatus).toBe("SUBMITTED");
    expect(application?.history[0].actorId).toBe(candidate.id);
  });

  it("stores an evaluation that is consistent across repeated reads", async () => {
    const recruiter = await createTestUser({ role: "RECRUITER" });
    const candidate = await createTestUser({ role: "CANDIDATE" });
    const job = await createTestJob({ createdById: recruiter.id });
    signIn(candidate);
    await prepareCandidate(candidate.id, job.id);

    await expectRedirect(applyToJobAction(undefined, applyForm(job.id)));

    const application = await prisma.application.findUnique({
      where: { candidateId_jobId: { candidateId: candidate.id, jobId: job.id } },
      include: { evaluation: true },
    });

    const scores = new Set(
      Array.from({ length: 5 }, () => application?.evaluation?.score),
    );
    expect(scores.size).toBe(1);
    expect(application?.evaluation?.score).toBeGreaterThanOrEqual(1);
    expect(application?.evaluation?.score).toBeLessThanOrEqual(10);
  });

  it("ignores any client-supplied score or status", async () => {
    const recruiter = await createTestUser({ role: "RECRUITER" });
    const candidate = await createTestUser({ role: "CANDIDATE" });
    const job = await createTestJob({ createdById: recruiter.id });
    signIn(candidate);
    await prepareCandidate(candidate.id, job.id);

    const data = applyForm(job.id);
    data.set("score", "10");
    data.set("status", "SHORTLISTED");

    await expectRedirect(applyToJobAction(undefined, data));

    const application = await prisma.application.findUnique({
      where: { candidateId_jobId: { candidateId: candidate.id, jobId: job.id } },
      include: { evaluation: true },
    });

    expect(application?.status).toBe("SUBMITTED");
    expect(application?.evaluation?.score).not.toBe(10);
    expect(application?.evaluation?.score).toBe(evaluateResume(GOOD_RESUME).score);
  });

  it("blocks a recruiter from submitting an application", async () => {
    const recruiter = await createTestUser({ role: "RECRUITER" });
    const job = await createTestJob({ createdById: recruiter.id });
    signIn(recruiter);

    const state = await applyToJobAction(undefined, applyForm(job.id));

    expect(state?.message).toBe("Only candidates can submit job applications.");
    expect(
      await prisma.application.findFirst({
        where: { candidateId: recruiter.id, jobId: job.id },
      }),
    ).toBeNull();
  });

  it("requires the user to be signed in", async () => {
    currentUser.mockResolvedValue(null);
    const recruiter = await createTestUser({ role: "RECRUITER" });
    const job = await createTestJob({ createdById: recruiter.id });

    const state = await applyToJobAction(undefined, applyForm(job.id));

    expect(state?.message).toBe(
      "You must be signed in to apply for a job.",
    );
  });

  it("accepts a short resume summary without a minimum length", async () => {
    const recruiter = await createTestUser({ role: "RECRUITER" });
    const candidate = await createTestUser({ role: "CANDIDATE" });
    const job = await createTestJob({ createdById: recruiter.id });
    signIn(candidate);
    await prepareCandidate(candidate.id, job.id);

    await expectRedirect(
      applyToJobAction(undefined, applyForm(job.id, "Too short.")),
    );

    const application = await prisma.application.findUnique({
      where: { candidateId_jobId: { candidateId: candidate.id, jobId: job.id } },
    });
    expect(application?.resumeSummary).toBe("Too short.");
  });
});

describe("rejecting ineligible jobs", () => {
  it("rejects applications to a draft job", async () => {
    const recruiter = await createTestUser({ role: "RECRUITER" });
    const candidate = await createTestUser({ role: "CANDIDATE" });
    const job = await createTestJob({ createdById: recruiter.id, status: "DRAFT" });
    signIn(candidate);

    const state = await applyToJobAction(undefined, applyForm(job.id));

    expect(state?.message).toBe("Applications for this job are closed.");
    expect(await prisma.application.count({ where: { jobId: job.id } })).toBe(0);
  });

  it("rejects applications to a closed job", async () => {
    const recruiter = await createTestUser({ role: "RECRUITER" });
    const candidate = await createTestUser({ role: "CANDIDATE" });
    const job = await createTestJob({ createdById: recruiter.id, status: "CLOSED" });
    signIn(candidate);

    const state = await applyToJobAction(undefined, applyForm(job.id));

    expect(state?.message).toBe("Applications for this job are closed.");
  });

  it("rejects applications after the deadline has passed", async () => {
    const recruiter = await createTestUser({ role: "RECRUITER" });
    const candidate = await createTestUser({ role: "CANDIDATE" });
    const now = Date.now();
    const job = await createTestJob({
      createdById: recruiter.id,
      status: "PUBLISHED",
      opensAt: new Date(now - 10 * 24 * 60 * 60 * 1000),
      closesAt: new Date(now - 60 * 60 * 1000),
    });
    signIn(candidate);

    const state = await applyToJobAction(undefined, applyForm(job.id));

    expect(state?.message).toBe("Applications for this job are closed.");
    expect(await prisma.application.count({ where: { jobId: job.id } })).toBe(0);
  });

  it("rejects applications before the opening date", async () => {
    const recruiter = await createTestUser({ role: "RECRUITER" });
    const candidate = await createTestUser({ role: "CANDIDATE" });
    const now = Date.now();
    const job = await createTestJob({
      createdById: recruiter.id,
      status: "PUBLISHED",
      opensAt: new Date(now + 24 * 60 * 60 * 1000),
      closesAt: new Date(now + 30 * 24 * 60 * 60 * 1000),
    });
    signIn(candidate);

    const state = await applyToJobAction(undefined, applyForm(job.id));

    expect(state?.message).toBe(
      "Applications for this job are not yet open.",
    );
  });

  it("rejects applications to a job that does not exist", async () => {
    const candidate = await createTestUser({ role: "CANDIDATE" });
    signIn(candidate);

    const state = await applyToJobAction(undefined, applyForm("does-not-exist"));

    expect(state?.message).toBe("Job vacancy not found.");
  });
});

describe("duplicate application prevention", () => {
  it("stops a candidate from applying twice for the same job", async () => {
    const recruiter = await createTestUser({ role: "RECRUITER" });
    const candidate = await createTestUser({ role: "CANDIDATE" });
    const job = await createTestJob({ createdById: recruiter.id });
    signIn(candidate);
    await prepareCandidate(candidate.id, job.id);

    await expectRedirect(applyToJobAction(undefined, applyForm(job.id)));
    const state = await applyToJobAction(undefined, applyForm(job.id));

    expect(state?.message).toBe(
      "You have already applied for this job vacancy.",
    );
    expect(
      await prisma.application.count({ where: { jobId: job.id } }),
    ).toBe(1);
  });

  it("is enforced by a database-level unique constraint", async () => {
    const recruiter = await createTestUser({ role: "RECRUITER" });
    const candidate = await createTestUser({ role: "CANDIDATE" });
    const job = await createTestJob({ createdById: recruiter.id });

    await prisma.application.create({
      data: { candidateId: candidate.id, jobId: job.id, resumeSummary: GOOD_RESUME },
    });

    await expect(
      prisma.application.create({
        data: { candidateId: candidate.id, jobId: job.id, resumeSummary: GOOD_RESUME },
      }),
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("allows different candidates to apply to the same job", async () => {
    const recruiter = await createTestUser({ role: "RECRUITER" });
    const first = await createTestUser({ role: "CANDIDATE" });
    const second = await createTestUser({ role: "CANDIDATE" });
    const job = await createTestJob({ createdById: recruiter.id });

    signIn(first);
    await prepareCandidate(first.id, job.id);
    await expectRedirect(applyToJobAction(undefined, applyForm(job.id)));

    signIn(second);
    await prepareCandidate(second.id, job.id);
    await expectRedirect(applyToJobAction(undefined, applyForm(job.id)));

    expect(await prisma.application.count({ where: { jobId: job.id } })).toBe(2);
  });
});
