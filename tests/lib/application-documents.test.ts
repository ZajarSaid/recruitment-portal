import { describe, expect, it } from "vitest";

import {
  applicationLetterRequirement,
  buildRequirementSnapshot,
  getAccessibleApplicationDocument,
  getAccessibleApplicationProfileDocument,
  parseRequirementSnapshot,
  resolveRequirementViews,
  summarizeApplicationDocuments,
} from "@/lib/application-documents";
import { prisma } from "@/lib/db";
import {
  APPLICATION_LETTER_KEY,
  APPLICATION_LETTER_LABEL,
} from "@/lib/profile-documents";
import {
  createTestApplication,
  createTestApplicationDocument,
  createTestJob,
  createTestProfile,
  createTestUser,
} from "../harness/fixtures";

type Document = Parameters<typeof summarizeApplicationDocuments>[1][number];

describe("getAccessibleApplicationProfileDocument", () => {
  it("allows the vacancy manager to read the applicant's current credentials only", async () => {
    const recruiter = await createTestUser({ role: "RECRUITER" });
    const otherRecruiter = await createTestUser({ role: "RECRUITER" });
    const candidate = await createTestUser();
    const job = await createTestJob({ createdById: recruiter.id });
    const profile = await createTestProfile({ userId: candidate.id, category: "MEDICINE" });
    const application = await createTestApplication({ candidateId: candidate.id, jobId: job.id });
    const file = await prisma.candidateDocument.create({
      data: {
        profileId: profile.id,
        documentKey: "MEDICAL_QUALIFICATION",
        storageKey: `tests/${profile.id}/qualification.pdf`,
        originalFileName: "qualification.pdf",
        mimeType: "application/pdf",
        fileSize: 512,
      },
    });

    expect(await getAccessibleApplicationProfileDocument(file.id, application.id, recruiter))
      .toMatchObject({ storageKey: file.storageKey });
    expect(await getAccessibleApplicationProfileDocument(file.id, application.id, otherRecruiter))
      .toBeNull();

    await prisma.candidateProfile.update({ where: { id: profile.id }, data: { category: "GENERAL" } });
    expect(await getAccessibleApplicationProfileDocument(file.id, application.id, recruiter))
      .toBeNull();
  });
});

function document(
  overrides: Partial<Document> & { id: string },
): Document {
  return {
    documentKey: null,
    requirementKey: null,
    originalFileName: "cv.pdf",
    mimeType: "application/pdf",
    fileSize: 1024,
    reviewStatus: "PENDING",
    reviewComment: null,
    ...overrides,
  };
}

describe("applicationLetterRequirement", () => {
  it("describes the single modern application requirement", () => {
    const requirement = applicationLetterRequirement();
    expect(requirement.id).toBe(APPLICATION_LETTER_KEY);
    expect(requirement.customName).toBe(APPLICATION_LETTER_LABEL);
    expect(requirement.requirementStatus).toBe("REQUIRED");
    expect(requirement.displayOrder).toBe(0);
  });
});

describe("summarizeApplicationDocuments", () => {
  it("reports no requirements as fully satisfied", () => {
    const summary = summarizeApplicationDocuments([], []);
    expect(summary.requiredCount).toBe(0);
    expect(summary.missingRequired).toBe(0);
    expect(summary.allRequiredSubmitted).toBe(true);
    expect(summary.allRequiredAccepted).toBe(true);
    expect(summary.requirements).toEqual([]);
    expect(summary.extra).toEqual([]);
  });

  it("marks a missing mandatory document", () => {
    const summary = summarizeApplicationDocuments(
      [
        {
          id: APPLICATION_LETTER_KEY,
          label: APPLICATION_LETTER_LABEL,
          description: null,
          requirementStatus: "REQUIRED",
        },
      ],
      [],
    );
    expect(summary.missingRequired).toBe(1);
    expect(summary.allRequiredSubmitted).toBe(false);
    expect(summary.requirements[0].status).toBe("MISSING");
  });

  it("counts accepted documents and reports verification", () => {
    const summary = summarizeApplicationDocuments(
      [
        {
          id: APPLICATION_LETTER_KEY,
          label: APPLICATION_LETTER_LABEL,
          description: null,
          requirementStatus: "REQUIRED",
        },
      ],
      [
        document({
          id: "d1",
          requirementKey: APPLICATION_LETTER_KEY,
          reviewStatus: "ACCEPTED",
        }),
      ],
    );
    expect(summary.requiredSubmitted).toBe(1);
    expect(summary.allRequiredSubmitted).toBe(true);
    expect(summary.allRequiredAccepted).toBe(true);
    expect(summary.acceptedCount).toBe(1);
    expect(summary.rejectedCount).toBe(0);
  });

  it("treats a rejected mandatory document as not verified", () => {
    const summary = summarizeApplicationDocuments(
      [
        {
          id: APPLICATION_LETTER_KEY,
          label: APPLICATION_LETTER_LABEL,
          description: null,
          requirementStatus: "REQUIRED",
        },
      ],
      [
        document({
          id: "d1",
          requirementKey: APPLICATION_LETTER_KEY,
          reviewStatus: "REJECTED",
        }),
      ],
    );
    expect(summary.allRequiredSubmitted).toBe(true);
    expect(summary.allRequiredAccepted).toBe(false);
    expect(summary.rejectedCount).toBe(1);
    expect(summary.requirements[0].status).toBe("REJECTED");
  });

  it("separates documents not tied to any requirement", () => {
    const summary = summarizeApplicationDocuments(
      [
        {
          id: APPLICATION_LETTER_KEY,
          label: APPLICATION_LETTER_LABEL,
          description: null,
          requirementStatus: "REQUIRED",
        },
      ],
      [
        document({ id: "d1", documentKey: APPLICATION_LETTER_KEY }),
        document({ id: "d3", documentKey: null }),
      ],
    );
    expect(summary.requirements[0].document?.id).toBe("d1");
    expect(summary.extra.map((item) => item.id)).toEqual(["d3"]);
  });

  it("matches a document by its immutable requirement key", () => {
    const summary = summarizeApplicationDocuments(
      [
        {
          id: APPLICATION_LETTER_KEY,
          label: APPLICATION_LETTER_LABEL,
          description: null,
          requirementStatus: "REQUIRED",
        },
      ],
      [
        document({
          id: "d1",
          requirementKey: APPLICATION_LETTER_KEY,
        }),
      ],
    );
    expect(summary.requirements[0].document?.id).toBe("d1");
    expect(summary.allRequiredSubmitted).toBe(true);
    expect(summary.extra).toEqual([]);
  });
});

describe("requirement snapshots", () => {
  it("freezes the application letter with a stable key and order", () => {
    const snapshot = buildRequirementSnapshot([applicationLetterRequirement()]);
    expect(snapshot).toEqual([
      {
        id: APPLICATION_LETTER_KEY,
        label: APPLICATION_LETTER_LABEL,
        description: expect.any(String),
        requirementStatus: "REQUIRED",
        displayOrder: 0,
      },
    ]);
  });

  it("round-trips through JSON without losing meaning", () => {
    const snapshot = buildRequirementSnapshot([applicationLetterRequirement()]);
    const parsed = parseRequirementSnapshot(
      JSON.parse(JSON.stringify(snapshot)),
    );
    expect(parsed).toEqual(snapshot);
  });

  it("treats a non-array snapshot as a legacy application", () => {
    expect(parseRequirementSnapshot(null)).toBeNull();
    expect(parseRequirementSnapshot({})).toBeNull();
    expect(parseRequirementSnapshot(undefined)).toBeNull();
  });

  it("keeps an empty snapshot meaningful", () => {
    expect(parseRequirementSnapshot([])).toEqual([]);
  });
});

describe("resolveRequirementViews", () => {
  it("uses the snapshot regardless of later changes", () => {
    const snapshot = buildRequirementSnapshot([applicationLetterRequirement()]);
    const views = resolveRequirementViews({ requirementSnapshot: snapshot });
    expect(views.map((view) => view.id)).toEqual([APPLICATION_LETTER_KEY]);
    expect(views[0].label).toBe(APPLICATION_LETTER_LABEL);
  });

  it("never reports a legacy application as missing documents", () => {
    const views = resolveRequirementViews({ requirementSnapshot: null });
    expect(views).toEqual([]);
  });

  it("honours an empty snapshot", () => {
    const views = resolveRequirementViews({ requirementSnapshot: [] });
    expect(views).toEqual([]);
  });
});

describe("legacy applications (no snapshot)", () => {
  it("is not reported as missing documents that were required later", async () => {
    const owner = await createTestUser({ role: "RECRUITER" });
    const candidate = await createTestUser({ role: "CANDIDATE" });
    const job = await createTestJob({ createdById: owner.id });

    const application = await createTestApplication({
      candidateId: candidate.id,
      jobId: job.id,
    });
    expect(application.requirementSnapshot).toBeNull();

    const documents = await (await import("@/lib/db")).prisma.applicationDocument.findMany({
      where: { applicationId: application.id },
    });

    const views = resolveRequirementViews(application);
    const summary = summarizeApplicationDocuments(views, documents);
    expect(views).toEqual([]);
    expect(summary.missingRequired).toBe(0);
    expect(summary.allRequiredSubmitted).toBe(true);
    expect(summary.extra).toEqual([]);
  });
});

describe("document download authorization", () => {
  async function seed() {
    const owner = await createTestUser({ role: "RECRUITER" });
    const candidate = await createTestUser({ role: "CANDIDATE" });
    const job = await createTestJob({ createdById: owner.id });
    const application = await createTestApplication({
      candidateId: candidate.id,
      jobId: job.id,
    });
    const document = await createTestApplicationDocument({
      applicationId: application.id,
      documentKey: APPLICATION_LETTER_KEY,
      requirementKey: APPLICATION_LETTER_KEY,
    });
    return { owner, candidate, job, application, document };
  }

  it("lets the candidate who owns the application read their document", async () => {
    const { candidate, application, document } = await seed();
    const result = await getAccessibleApplicationDocument(
      document.id,
      application.id,
      candidate,
    );
    expect(result).not.toBeNull();
    expect(result?.id).toBe(document.id);
  });

  it("blocks a different candidate", async () => {
    const { application, document } = await seed();
    const other = await createTestUser({ role: "CANDIDATE" });
    const result = await getAccessibleApplicationDocument(
      document.id,
      application.id,
      other,
    );
    expect(result).toBeNull();
  });

  it("blocks an unrelated recruiter", async () => {
    const { application, document } = await seed();
    const intruder = await createTestUser({ role: "RECRUITER" });
    const result = await getAccessibleApplicationDocument(
      document.id,
      application.id,
      intruder,
    );
    expect(result).toBeNull();
  });

  it("blocks the owning recruiter when the application id does not match", async () => {
    const { owner, document } = await seed();
    const result = await getAccessibleApplicationDocument(
      document.id,
      "some-other-application",
      owner,
    );
    expect(result).toBeNull();
  });

  it("lets the vacancy owner read the document", async () => {
    const { owner, application, document } = await seed();
    const result = await getAccessibleApplicationDocument(
      document.id,
      application.id,
      owner,
    );
    expect(result).not.toBeNull();
  });

  it("lets the assigned recruiter read the document", async () => {
    const { application, document, job } = await seed();
    const recruiter = await createTestUser({ role: "RECRUITER" });
    const prisma = (await import("@/lib/db")).prisma;
    await prisma.job.update({
      where: { id: job.id },
      data: { recruiterId: recruiter.id },
    });
    const result = await getAccessibleApplicationDocument(
      document.id,
      application.id,
      recruiter,
    );
    expect(result).not.toBeNull();
  });

  it("lets an administrator read any document", async () => {
    const { application, document } = await seed();
    const admin = await createTestUser({ role: "ADMIN" });
    const result = await getAccessibleApplicationDocument(
      document.id,
      application.id,
      admin,
    );
    expect(result).not.toBeNull();
  });

  it("returns null when the document does not exist", async () => {
    const { candidate, application } = await seed();
    const result = await getAccessibleApplicationDocument(
      "does-not-exist",
      application.id,
      candidate,
    );
    expect(result).toBeNull();
  });
});
