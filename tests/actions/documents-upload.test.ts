import { beforeEach, describe, expect, it, vi } from "vitest";

import { applyToJobAction } from "@/lib/actions/applications";
import { uploadStagedDocumentAction, removeStagedDocumentAction } from "@/lib/actions/documents";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/dal";
import { resetRateLimits } from "@/lib/rate-limit";
import {
  createTestJob,
  createTestRequirement,
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

function applyForm(jobId: string): FormData {
  return formData({
    jobId,
    resumeSummary:
      "Bachelor's degree in Computer Science with 8 years of experience. " +
      "Proficient in TypeScript and PostgreSQL. Skills include system design and mentoring.",
  });
}

beforeEach(() => {
  resetCookies();
  resetRateLimits();
  currentUser.mockReset();
});

describe("staged document actions", () => {
  it("uploads a document and creates a staged record", async () => {
    const recruiter = await createTestUser({ role: "RECRUITER" });
    const candidate = await createTestUser({ role: "CANDIDATE" });
    const job = await createTestJob({ createdById: recruiter.id, status: "PUBLISHED" });
    const requirement = await createTestRequirement({ jobId: job.id, customName: "CV" });

    signIn(candidate);
    const fd = formData({
      jobId: job.id,
      requirementId: requirement.id,
    });
    fd.set("file", testFile());

    const state = await uploadStagedDocumentAction(undefined, fd);
    expect(state?.ok).toBe(true);
    expect(state?.requirementId).toBe(requirement.id);
    expect(state?.document?.originalFileName).toBe("cv.pdf");

    const staged = await prisma.stagedDocument.findUnique({
      where: {
        candidateId_jobId_jobDocumentRequirementId: {
          candidateId: candidate.id,
          jobId: job.id,
          jobDocumentRequirementId: requirement.id,
        },
      },
    });
    expect(staged).not.toBeNull();
  });

  it("replaces an existing staged document", async () => {
    const recruiter = await createTestUser({ role: "RECRUITER" });
    const candidate = await createTestUser({ role: "CANDIDATE" });
    const job = await createTestJob({ createdById: recruiter.id });
    const requirement = await createTestRequirement({ jobId: job.id, customName: "CV" });

    signIn(candidate);
    const fd = formData({ jobId: job.id, requirementId: requirement.id });
    fd.set("file", testFile());

    const first = await uploadStagedDocumentAction(undefined, fd);
    expect(first?.ok).toBe(true);
    const firstKey = (await prisma.stagedDocument.findFirst({
      where: { candidateId: candidate.id, jobId: job.id, jobDocumentRequirementId: requirement.id },
    }))!.storageKey;

    fd.set("file", testFile(Buffer.from("%PDF-1.7\n2\n"), { name: "resume.pdf" }));
    const second = await uploadStagedDocumentAction(undefined, fd);
    expect(second?.ok).toBe(true);
    expect(second?.document?.originalFileName).toBe("resume.pdf");

    const staged = await prisma.stagedDocument.findFirst({
      where: { candidateId: candidate.id, jobId: job.id, jobDocumentRequirementId: requirement.id },
    });
    expect(staged?.storageKey).not.toBe(firstKey);
  });

  it("removes a staged document", async () => {
    const recruiter = await createTestUser({ role: "RECRUITER" });
    const candidate = await createTestUser({ role: "CANDIDATE" });
    const job = await createTestJob({ createdById: recruiter.id });
    const requirement = await createTestRequirement({ jobId: job.id, customName: "CV" });

    signIn(candidate);
    const upload = formData({ jobId: job.id, requirementId: requirement.id });
    upload.set("file", testFile());
    await uploadStagedDocumentAction(undefined, upload);

    const remove = formData({ jobId: job.id, requirementId: requirement.id });
    const state = await removeStagedDocumentAction(undefined, remove);
    expect(state?.ok).toBe(true);
    expect(state?.document).toBeNull();

    const staged = await prisma.stagedDocument.count({
      where: { candidateId: candidate.id, jobId: job.id, jobDocumentRequirementId: requirement.id },
    });
    expect(staged).toBe(0);
  });

  it("prevents uploads to a job that is not accepting applications", async () => {
    const recruiter = await createTestUser({ role: "RECRUITER" });
    const candidate = await createTestUser({ role: "CANDIDATE" });
    const job = await createTestJob({ createdById: recruiter.id, status: "CLOSED" });
    const requirement = await createTestRequirement({ jobId: job.id, customName: "CV" });

    signIn(candidate);
    const fd = formData({ jobId: job.id, requirementId: requirement.id });
    fd.set("file", testFile());

    const state = await uploadStagedDocumentAction(undefined, fd);
    expect(state?.message).toBe("This vacancy is no longer accepting documents.");
  });

  it("requires authentication to upload", async () => {
    currentUser.mockResolvedValue(null);
    const state = await uploadStagedDocumentAction(undefined, formData({ jobId: "x", requirementId: "r" }));
    expect(state?.message).toBe("You must be signed in to upload documents.");
  });

  it("blocks a recruiter from uploading", async () => {
    const recruiter = await createTestUser({ role: "RECRUITER" });
    signIn(recruiter);
    const fd = formData({ jobId: "x", requirementId: "r" });
    fd.set("file", testFile());
    const state = await uploadStagedDocumentAction(undefined, fd);
    expect(state?.message).toBe("Only candidates can upload application documents.");
  });
});

describe("applying with required documents", () => {
  it("submits successfully when all required documents are staged", async () => {
    const recruiter = await createTestUser({ role: "RECRUITER" });
    const candidate = await createTestUser({ role: "CANDIDATE" });
    const job = await createTestJob({ createdById: recruiter.id });
    const req = await createTestRequirement({ jobId: job.id, customName: "CV" });

    signIn(candidate);
    const upload = formData({ jobId: job.id, requirementId: req.id });
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
    expect(application?.documents[0].jobDocumentRequirementId).toBe(req.id);
    expect(application?.documents[0].requirementKey).toBe(req.id);
    expect(application?.requirementSnapshot).toEqual([
      {
        id: req.id,
        label: "CV",
        description: null,
        requirementStatus: "REQUIRED",
        displayOrder: 0,
      },
    ]);

    const staged = await prisma.stagedDocument.count({
      where: { candidateId: candidate.id, jobId: job.id },
    });
    expect(staged).toBe(0);
  });

  it("keeps the submission snapshot after the vacancy requirements change", async () => {
    const recruiter = await createTestUser({ role: "RECRUITER" });
    const candidate = await createTestUser({ role: "CANDIDATE" });
    const job = await createTestJob({ createdById: recruiter.id });
    const req = await createTestRequirement({ jobId: job.id, customName: "CV" });

    signIn(candidate);
    const upload = formData({ jobId: job.id, requirementId: req.id });
    upload.set("file", testFile());
    await uploadStagedDocumentAction(undefined, upload);
    await expectRedirect(applyToJobAction(undefined, applyForm(job.id)));

    // The recruiter renames and relaxes the requirement afterwards.
    await prisma.jobDocumentRequirement.update({
      where: { id: req.id },
      data: { customName: "Renamed later", requirementStatus: "OPTIONAL" },
    });

    const application = await prisma.application.findUnique({
      where: { candidateId_jobId: { candidateId: candidate.id, jobId: job.id } },
    });
    expect(application?.requirementSnapshot).toEqual([
      {
        id: req.id,
        label: "CV",
        description: null,
        requirementStatus: "REQUIRED",
        displayOrder: 0,
      },
    ]);
  });

  it("keeps the snapshot and the document key even if the requirement is deleted", async () => {
    const recruiter = await createTestUser({ role: "RECRUITER" });
    const candidate = await createTestUser({ role: "CANDIDATE" });
    const job = await createTestJob({ createdById: recruiter.id });
    const req = await createTestRequirement({ jobId: job.id, customName: "CV" });

    signIn(candidate);
    const upload = formData({ jobId: job.id, requirementId: req.id });
    upload.set("file", testFile());
    await uploadStagedDocumentAction(undefined, upload);
    await expectRedirect(applyToJobAction(undefined, applyForm(job.id)));

    await prisma.jobDocumentRequirement.delete({ where: { id: req.id } });

    const application = await prisma.application.findUnique({
      where: { candidateId_jobId: { candidateId: candidate.id, jobId: job.id } },
      include: { documents: true },
    });
    expect(application?.documents[0].requirementKey).toBe(req.id);
    expect(application?.documents[0].jobDocumentRequirementId).toBeNull();
    expect(application?.requirementSnapshot).toMatchObject([
      { id: req.id, label: "CV", requirementStatus: "REQUIRED" },
    ]);
  });

  it("prevents submission when a required document is missing", async () => {
    const recruiter = await createTestUser({ role: "RECRUITER" });
    const candidate = await createTestUser({ role: "CANDIDATE" });
    const job = await createTestJob({ createdById: recruiter.id });
    await createTestRequirement({ jobId: job.id, customName: "Police clearance" });

    signIn(candidate);
    const state = await applyToJobAction(undefined, applyForm(job.id));
    expect(state?.message).toMatch(/Please upload all required documents/);
    expect(state?.message).toMatch(/Police clearance/);

    const app = await prisma.application.findUnique({
      where: { candidateId_jobId: { candidateId: candidate.id, jobId: job.id } },
    });
    expect(app).toBeNull();
  });

  it("allows submission when only optional documents are missing", async () => {
    const recruiter = await createTestUser({ role: "RECRUITER" });
    const candidate = await createTestUser({ role: "CANDIDATE" });
    const job = await createTestJob({ createdById: recruiter.id });
    await createTestRequirement({ jobId: job.id, requirementStatus: "OPTIONAL" });

    signIn(candidate);
    const target = await expectRedirect(applyToJobAction(undefined, applyForm(job.id)));
    expect(target).toBe("/dashboard");

    const app = await prisma.application.findUnique({
      where: { candidateId_jobId: { candidateId: candidate.id, jobId: job.id } },
      include: { documents: true },
    });
    expect(app?.documents).toHaveLength(0);
  });
});
