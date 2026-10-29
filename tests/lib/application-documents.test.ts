import { describe, expect, it } from "vitest";

import {
  buildRequirementSnapshot,
  getAccessibleApplicationDocument,
  parseRequirementSnapshot,
  resolveRequirementViews,
  summarizeApplicationDocuments,
  type RequirementSource,
} from "@/lib/application-documents";
import {
  createTestApplication,
  createTestApplicationDocument,
  createTestJob,
  createTestRequirement,
  createTestUser,
} from "../harness/fixtures";
import { listJobRequirements } from "@/lib/job-documents";
import { prisma } from "@/lib/db";

type Requirement = Parameters<typeof summarizeApplicationDocuments>[0][number];
type Document = Parameters<typeof summarizeApplicationDocuments>[1][number];

function requirement(
  overrides: Partial<Requirement> & { id: string },
): Requirement {
  return {
    label: "CV",
    description: null,
    requirementStatus: "REQUIRED",
    ...overrides,
  };
}

function document(
  overrides: Partial<Document> & { id: string },
): Document {
  return {
    jobDocumentRequirementId: null,
    originalFileName: "cv.pdf",
    mimeType: "application/pdf",
    fileSize: 1024,
    reviewStatus: "PENDING",
    reviewComment: null,
    ...overrides,
  };
}

function liveRequirement(
  overrides: Partial<RequirementSource> & { id: string },
): RequirementSource {
  return {
    customName: null,
    description: null,
    requirementStatus: "REQUIRED",
    displayOrder: 0,
    documentType: { name: `Doc ${overrides.id}` },
    ...overrides,
  };
}

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
      [requirement({ id: "r1" })],
      [],
    );
    expect(summary.missingRequired).toBe(1);
    expect(summary.allRequiredSubmitted).toBe(false);
    expect(summary.requirements[0].status).toBe("MISSING");
  });

  it("distinguishes optional documents from mandatory ones", () => {
    const summary = summarizeApplicationDocuments(
      [
        requirement({ id: "r1", requirementStatus: "REQUIRED" }),
        requirement({ id: "r2", requirementStatus: "OPTIONAL" }),
      ],
      [],
    );
    expect(summary.requiredCount).toBe(1);
    expect(summary.missingRequired).toBe(1);
    expect(summary.requirements.map((item) => item.status)).toEqual([
      "MISSING",
      "MISSING",
    ]);
  });

  it("counts accepted documents and reports verification", () => {
    const summary = summarizeApplicationDocuments(
      [requirement({ id: "r1" }), requirement({ id: "r2", label: "Letter" })],
      [
        document({ id: "d1", jobDocumentRequirementId: "r1", reviewStatus: "ACCEPTED" }),
        document({ id: "d2", jobDocumentRequirementId: "r2", reviewStatus: "ACCEPTED" }),
      ],
    );
    expect(summary.requiredSubmitted).toBe(2);
    expect(summary.allRequiredSubmitted).toBe(true);
    expect(summary.allRequiredAccepted).toBe(true);
    expect(summary.acceptedCount).toBe(2);
    expect(summary.rejectedCount).toBe(0);
    expect(summary.requirements[1].label).toBe("Letter");
  });

  it("treats a rejected mandatory document as not verified", () => {
    const summary = summarizeApplicationDocuments(
      [requirement({ id: "r1" })],
      [
        document({ id: "d1", jobDocumentRequirementId: "r1", reviewStatus: "REJECTED" }),
      ],
    );
    expect(summary.allRequiredSubmitted).toBe(true);
    expect(summary.allRequiredAccepted).toBe(false);
    expect(summary.rejectedCount).toBe(1);
    expect(summary.requirements[0].status).toBe("REJECTED");
  });

  it("separates documents whose requirement no longer exists", () => {
    const summary = summarizeApplicationDocuments(
      [requirement({ id: "r1" })],
      [
        document({ id: "d1", jobDocumentRequirementId: "r1" }),
        document({ id: "d2", jobDocumentRequirementId: "gone" }),
        document({ id: "d3", jobDocumentRequirementId: null }),
      ],
    );
    expect(summary.requirements[0].document?.id).toBe("d1");
    expect(summary.extra.map((item) => item.id)).toEqual(["d2", "d3"]);
  });

  it("matches a document by its immutable requirement key", () => {
    const summary = summarizeApplicationDocuments(
      [requirement({ id: "r1" })],
      [
        document({
          id: "d1",
          jobDocumentRequirementId: null,
          requirementKey: "r1",
        }),
      ],
    );
    expect(summary.requirements[0].document?.id).toBe("d1");
    expect(summary.allRequiredSubmitted).toBe(true);
    expect(summary.extra).toEqual([]);
  });
});

describe("requirement snapshots", () => {
  it("freezes live requirements with a stable key and order", () => {
    const snapshot = buildRequirementSnapshot([
      liveRequirement({
        id: "b",
        displayOrder: 1,
        customName: "Referee letters",
        documentType: null,
        description: "Two references.",
      }),
      liveRequirement({ id: "a", displayOrder: 0 }),
    ]);

    expect(snapshot).toEqual([
      {
        id: "a",
        label: "Doc a",
        description: null,
        requirementStatus: "REQUIRED",
        displayOrder: 0,
      },
      {
        id: "b",
        label: "Referee letters",
        description: "Two references.",
        requirementStatus: "REQUIRED",
        displayOrder: 1,
      },
    ]);
  });

  it("prefers a custom name over the catalogue name", () => {
    const snapshot = buildRequirementSnapshot([
      liveRequirement({ id: "r1", customName: "Police clearance" }),
    ]);
    expect(snapshot[0].label).toBe("Police clearance");
  });

  it("round-trips through JSON without losing meaning", () => {
    const snapshot = buildRequirementSnapshot([
      liveRequirement({ id: "r1", requirementStatus: "OPTIONAL" }),
    ]);
    const parsed = parseRequirementSnapshot(JSON.parse(JSON.stringify(snapshot)));
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
  it("uses the snapshot even after the vacancy requirements change", () => {
    const snapshot = buildRequirementSnapshot([liveRequirement({ id: "r1" })]);
    const views = resolveRequirementViews(
      { requirementSnapshot: snapshot },
      [liveRequirement({ id: "r2", customName: "Renamed requirement" })],
      [],
    );
    expect(views.map((view) => view.id)).toEqual(["r1"]);
    expect(views[0].label).toBe("Doc r1");
  });

  it("never reports a legacy application as missing documents", () => {
    const views = resolveRequirementViews(
      { requirementSnapshot: null },
      [liveRequirement({ id: "r1" }), liveRequirement({ id: "r2" })],
      [{ jobDocumentRequirementId: "r1", requirementKey: null }],
    );
    expect(views.map((view) => view.id)).toEqual(["r1"]);
  });

  it("matches legacy documents by their immutable requirement key", () => {
    const views = resolveRequirementViews(
      { requirementSnapshot: null },
      [liveRequirement({ id: "r1" })],
      [{ jobDocumentRequirementId: null, requirementKey: "r1" }],
    );
    expect(views.map((view) => view.id)).toEqual(["r1"]);
  });

  it("honours an empty snapshot for a vacancy with no requirements", () => {
    const views = resolveRequirementViews(
      { requirementSnapshot: [] },
      [liveRequirement({ id: "r1" })],
      [],
    );
    expect(views).toEqual([]);
  });
});

describe("legacy applications (no snapshot)", () => {
  it("is not reported as missing documents that were added later", async () => {
    const owner = await createTestUser({ role: "RECRUITER" });
    const candidate = await createTestUser({ role: "CANDIDATE" });
    const job = await createTestJob({ createdById: owner.id });
    await createTestRequirement({ jobId: job.id, customName: "Added later" });

    const application = await createTestApplication({
      candidateId: candidate.id,
      jobId: job.id,
    });
    expect(application.requirementSnapshot).toBeNull();

    const live = await listJobRequirements(job.id);
    const documents = await prisma.applicationDocument.findMany({
      where: { applicationId: application.id },
    });

    const views = resolveRequirementViews(application, live, documents);
    const summary = summarizeApplicationDocuments(views, documents);
    expect(views).toEqual([]);
    expect(summary.missingRequired).toBe(0);
    expect(summary.allRequiredSubmitted).toBe(true);
  });

  it("still shows documents the legacy application actually attached", async () => {
    const owner = await createTestUser({ role: "RECRUITER" });
    const candidate = await createTestUser({ role: "CANDIDATE" });
    const job = await createTestJob({ createdById: owner.id });
    const requirement = await createTestRequirement({
      jobId: job.id,
      customName: "CV",
    });
    const application = await createTestApplication({
      candidateId: candidate.id,
      jobId: job.id,
    });
    await createTestApplicationDocument({
      applicationId: application.id,
      requirementId: requirement.id,
      requirementKey: requirement.id,
    });

    const live = await listJobRequirements(job.id);
    const documents = await prisma.applicationDocument.findMany({
      where: { applicationId: application.id },
    });

    const views = resolveRequirementViews(application, live, documents);
    const summary = summarizeApplicationDocuments(views, documents);
    expect(views.map((view) => view.label)).toEqual(["CV"]);
    expect(summary.missingRequired).toBe(0);
    expect(summary.requirements[0].document?.id).toBe(documents[0].id);
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
    const requirement = await createTestRequirement({
      jobId: job.id,
      customName: "CV",
    });
    const document = await createTestApplicationDocument({
      applicationId: application.id,
      requirementId: requirement.id,
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
    await createTestJob; // keep import used if tree-shaken
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
