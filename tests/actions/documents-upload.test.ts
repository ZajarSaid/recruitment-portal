import { beforeEach, describe, expect, it, vi } from "vitest";

import { applyToJobAction } from "@/lib/actions/applications";
import {
  uploadStagedDocumentAction,
  removeStagedDocumentAction,
} from "@/lib/actions/documents";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/dal";
import { resetRateLimits } from "@/lib/rate-limit";
import { APPLICATION_LETTER_KEY, APPLICATION_LETTER_LABEL } from "@/lib/profile-documents";
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

function signIn(user: {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
}) {
  currentUser.mockResolvedValue(toCurrentUser(user));
}

const SUMMARY =
  "Bachelor's degree in Computer Science with 8 years of experience. " +
  "Proficient in TypeScript and PostgreSQL. Skills include system design and mentoring.";

function applyForm(jobId: string): FormData {
  return formData({ jobId, resumeSummary: SUMMARY });
}

beforeEach(() => {
  resetCookies();
  resetRateLimits();
  currentUser.mockReset();
});

describe("staged document actions", () => {
  it("uploads the application letter and creates a staged record", async () => {
    const recruiter = await createTestUser({ role: "RECRUITER" });
    const candidate = await createTestUser({ role: "CANDIDATE" });
    await createTestProfile({ userId: candidate.id });
    const job = await createTestJob({ createdById: recruiter.id, status: "PUBLISHED" });

    signIn(candidate);
    const fd = formData({ jobId: job.id, documentKey: APPLICATION_LETTER_KEY });
    fd.set("file", testFile());

    const state = await uploadStagedDocumentAction(undefined, fd);
    expect(state?.ok).toBe(true);
    expect(state?.documentKey).toBe(APPLICATION_LETTER_KEY);
    expect(state?.document?.originalFileName).toBe("cv.pdf");

    const staged = await prisma.stagedDocument.findUnique({
      where: {
        candidateId_jobId_documentKey: {
          candidateId: candidate.id,
          jobId: job.id,
          documentKey: APPLICATION_LETTER_KEY,
        },
      },
    });
    expect(staged).not.toBeNull();
  });

  it("replaces an existing staged letter", async () => {
    const recruiter = await createTestUser({ role: "RECRUITER" });
    const candidate = await createTestUser({ role: "CANDIDATE" });
    await createTestProfile({ userId: candidate.id });
    const job = await createTestJob({ createdById: recruiter.id });

    signIn(candidate);
    const fd = formData({ jobId: job.id, documentKey: APPLICATION_LETTER_KEY });
    fd.set("file", testFile());

    const first = await uploadStagedDocumentAction(undefined, fd);
    expect(first?.ok).toBe(true);
    const firstKey = (await prisma.stagedDocument.findFirst({
      where: { candidateId: candidate.id, jobId: job.id, documentKey: APPLICATION_LETTER_KEY },
    }))!.storageKey;

    fd.set("file", testFile(Buffer.from("%PDF-1.7\n2\n"), { name: "resume.pdf" }));
    const second = await uploadStagedDocumentAction(undefined, fd);
    expect(second?.ok).toBe(true);
    expect(second?.document?.originalFileName).toBe("resume.pdf");

    const staged = await prisma.stagedDocument.findFirst({
      where: { candidateId: candidate.id, jobId: job.id, documentKey: APPLICATION_LETTER_KEY },
    });
    expect(staged?.storageKey).not.toBe(firstKey);
  });

  it("removes a staged letter", async () => {
    const recruiter = await createTestUser({ role: "RECRUITER" });
    const candidate = await createTestUser({ role: "CANDIDATE" });
    await createTestProfile({ userId: candidate.id });
    const job = await createTestJob({ createdById: recruiter.id });

    signIn(candidate);
    const upload = formData({ jobId: job.id, documentKey: APPLICATION_LETTER_KEY });
    upload.set("file", testFile());
    await uploadStagedDocumentAction(undefined, upload);

    const remove = formData({ jobId: job.id, documentKey: APPLICATION_LETTER_KEY });
    const state = await removeStagedDocumentAction(undefined, remove);
    expect(state?.ok).toBe(true);
    expect(state?.document).toBeNull();

    const staged = await prisma.stagedDocument.count({
      where: { candidateId: candidate.id, jobId: job.id },
    });
    expect(staged).toBe(0);
  });

  it("prevents uploads to a job that is not accepting applications", async () => {
    const recruiter = await createTestUser({ role: "RECRUITER" });
    const candidate = await createTestUser({ role: "CANDIDATE" });
    await createTestProfile({ userId: candidate.id });
    const job = await createTestJob({ createdById: recruiter.id, status: "CLOSED" });

    signIn(candidate);
    const fd = formData({ jobId: job.id, documentKey: APPLICATION_LETTER_KEY });
    fd.set("file", testFile());

    const state = await uploadStagedDocumentAction(undefined, fd);
    expect(state?.message).toBe("This vacancy is no longer accepting documents.");
  });

  it("requires authentication to upload", async () => {
    currentUser.mockResolvedValue(null);
    const state = await uploadStagedDocumentAction(undefined, formData({ jobId: "x" }));
    expect(state?.message).toBe("You must be signed in to upload documents.");
  });

  it("blocks a recruiter from uploading", async () => {
    const recruiter = await createTestUser({ role: "RECRUITER" });
    signIn(recruiter);
    const fd = formData({ jobId: "x" });
    fd.set("file", testFile());
    const state = await uploadStagedDocumentAction(undefined, fd);
    expect(state?.message).toBe("Only candidates can upload application documents.");
  });
});

describe("applying with the application letter", () => {
  it("submits successfully when the letter is staged", async () => {
    const recruiter = await createTestUser({ role: "RECRUITER" });
    const candidate = await createTestUser({ role: "CANDIDATE" });
    await createTestProfile({ userId: candidate.id });
    const job = await createTestJob({ createdById: recruiter.id });

    signIn(candidate);
    const upload = formData({ jobId: job.id, documentKey: APPLICATION_LETTER_KEY });
    upload.set("file", testFile());
    const uploadState = await uploadStagedDocumentAction(undefined, upload);
    expect(uploadState?.ok).toBe(true);

    const target = await expectRedirect(applyToJobAction(undefined, applyForm(job.id)));
    expect(target).toBe("/dashboard");

    const application = await prisma.application.findUnique({
      where: { candidateId_jobId: { candidateId: candidate.id, jobId: job.id } },
      include: { documents: true },
    });
    expect(application?.documents).toHaveLength(1);
    expect(application?.documents[0].reviewStatus).toBe("PENDING");
    expect(application?.documents[0].documentKey).toBe(APPLICATION_LETTER_KEY);
    expect(application?.documents[0].requirementKey).toBe(APPLICATION_LETTER_KEY);
    expect(application?.requirementSnapshot).toEqual([
      {
        id: APPLICATION_LETTER_KEY,
        label: APPLICATION_LETTER_LABEL,
        description: expect.any(String),
        requirementStatus: "REQUIRED",
        displayOrder: 0,
      },
    ]);

    const staged = await prisma.stagedDocument.count({
      where: { candidateId: candidate.id, jobId: job.id },
    });
    expect(staged).toBe(0);
  });

  it("keeps the submission snapshot after a job is edited", async () => {
    const recruiter = await createTestUser({ role: "RECRUITER" });
    const candidate = await createTestUser({ role: "CANDIDATE" });
    await createTestProfile({ userId: candidate.id });
    const job = await createTestJob({ createdById: recruiter.id });

    signIn(candidate);
    const upload = formData({ jobId: job.id, documentKey: APPLICATION_LETTER_KEY });
    upload.set("file", testFile());
    await uploadStagedDocumentAction(undefined, upload);
    await expectRedirect(applyToJobAction(undefined, applyForm(job.id)));

    await prisma.job.update({
      where: { id: job.id },
      data: { title: "Renamed later" },
    });

    const application = await prisma.application.findUnique({
      where: { candidateId_jobId: { candidateId: candidate.id, jobId: job.id } },
    });
    expect(application?.requirementSnapshot).toEqual([
      {
        id: APPLICATION_LETTER_KEY,
        label: APPLICATION_LETTER_LABEL,
        description: expect.any(String),
        requirementStatus: "REQUIRED",
        displayOrder: 0,
      },
    ]);
  });

  it("prevents submission when the letter is missing", async () => {
    const recruiter = await createTestUser({ role: "RECRUITER" });
    const candidate = await createTestUser({ role: "CANDIDATE" });
    await createTestProfile({ userId: candidate.id });
    const job = await createTestJob({ createdById: recruiter.id });

    signIn(candidate);
    const state = await applyToJobAction(undefined, applyForm(job.id));
    expect(state?.message).toMatch(/upload your signed application letter/);

    const app = await prisma.application.findUnique({
      where: { candidateId_jobId: { candidateId: candidate.id, jobId: job.id } },
    });
    expect(app).toBeNull();
  });

  it("requires a completed master profile before applying", async () => {
    const recruiter = await createTestUser({ role: "RECRUITER" });
    const candidate = await createTestUser({ role: "CANDIDATE" });
    const job = await createTestJob({ createdById: recruiter.id });

    signIn(candidate);
    const state = await applyToJobAction(undefined, applyForm(job.id));
    expect(state?.message).toMatch(/your profile is \d+% complete.*to apply/i);

    const app = await prisma.application.findUnique({
      where: { candidateId_jobId: { candidateId: candidate.id, jobId: job.id } },
    });
    expect(app).toBeNull();
  });

  it("does not require a resume summary to apply", async () => {
    const recruiter = await createTestUser({ role: "RECRUITER" });
    const candidate = await createTestUser({ role: "CANDIDATE" });
    await createTestProfile({ userId: candidate.id });
    const job = await createTestJob({ createdById: recruiter.id });

    signIn(candidate);
    const upload = formData({ jobId: job.id, documentKey: APPLICATION_LETTER_KEY });
    upload.set("file", testFile());
    await uploadStagedDocumentAction(undefined, upload);

    const target = await expectRedirect(
      applyToJobAction(undefined, formData({ jobId: job.id, documentKey: APPLICATION_LETTER_KEY })),
    );
    expect(target).toBe("/dashboard");

    const app = await prisma.application.findUnique({
      where: { candidateId_jobId: { candidateId: candidate.id, jobId: job.id } },
      include: { evaluation: true, documents: true },
    });
    expect(app?.resumeSummary).toBe("");
    expect(app?.evaluation).toBeNull();
    expect(app?.documents).toHaveLength(1);
  });

  it("creates an automatic evaluation when a resume summary is provided", async () => {
    const recruiter = await createTestUser({ role: "RECRUITER" });
    const candidate = await createTestUser({ role: "CANDIDATE" });
    await createTestProfile({ userId: candidate.id });
    const job = await createTestJob({ createdById: recruiter.id });

    signIn(candidate);
    const upload = formData({ jobId: job.id, documentKey: APPLICATION_LETTER_KEY });
    upload.set("file", testFile());
    await uploadStagedDocumentAction(undefined, upload);

    await expectRedirect(applyToJobAction(undefined, applyForm(job.id)));

    const app = await prisma.application.findUnique({
      where: { candidateId_jobId: { candidateId: candidate.id, jobId: job.id } },
      include: { evaluation: true },
    });
    expect(app?.evaluation).not.toBeNull();
    expect(app?.evaluation?.method).toBe("deterministic-rule-v1");
  });
});
