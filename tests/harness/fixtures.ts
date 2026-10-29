import { prisma } from "@/lib/db";
import type { CurrentUser } from "@/lib/dal";
import { hashPassword } from "@/lib/password";
import type { AppRole } from "@/lib/roles";
import type { Prisma } from "@/generated/prisma/client";

/** Narrows a database user to the shape returned by `getCurrentUser`. */
export function toCurrentUser(user: {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
}): CurrentUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as AppRole,
    isActive: user.isActive,
    createdAt: user.createdAt,
  };
}

/** Password used for accounts created through the test fixtures. */
export const DEFAULT_TEST_PASSWORD = "Password@123";

let counter = 0;
function uniqueId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}`;
}

/** Generates a unique, valid email address for test accounts. */
export function uniqueEmail(prefix = "user"): string {
  return `${uniqueId(prefix)}@test.local`;
}

export async function createTestUser(
  options: {
    role?: AppRole;
    isActive?: boolean;
    password?: string;
    name?: string;
  } = {},
) {
  const {
    role = "CANDIDATE",
    isActive = true,
    password = DEFAULT_TEST_PASSWORD,
    name = "Test User",
  } = options;

  const email = uniqueEmail();
  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: { name, email, passwordHash, role, isActive },
  });

  return { ...user, plainPassword: password };
}

export type TestJobOptions = {
  createdById: string;
  recruiterId?: string | null;
  title?: string;
  department?: string;
  location?: string;
  description?: string;
  qualifications?: string;
  status?: "DRAFT" | "PUBLISHED" | "CLOSED";
  opensAt?: Date;
  closesAt?: Date;
};

const DAY = 24 * 60 * 60 * 1000;

export async function createTestJob(options: TestJobOptions) {
  const now = Date.now();
  return prisma.job.create({
    data: {
      title: options.title ?? `Test Job ${uniqueId("job")}`,
      department: options.department ?? "ICT",
      location: options.location ?? "Dodoma",
      description:
        options.description ??
        "A detailed description of the test job used by the automated test suite.",
      qualifications:
        options.qualifications ??
        "Degree in a relevant field and at least two years of experience.",
      status: options.status ?? "PUBLISHED",
      opensAt: options.opensAt ?? new Date(now - DAY),
      closesAt: options.closesAt ?? new Date(now + DAY),
      createdById: options.createdById,
      recruiterId: options.recruiterId ?? null,
    },
  });
}

export async function createTestApplication(options: {
  candidateId: string;
  jobId: string;
  resumeSummary?: string;
  status?: "SUBMITTED" | "UNDER_REVIEW" | "SHORTLISTED" | "REJECTED";
  requirementSnapshot?: Prisma.InputJsonValue;
}) {
  return prisma.application.create({
    data: {
      candidateId: options.candidateId,
      jobId: options.jobId,
      resumeSummary:
        options.resumeSummary ??
        "Experienced professional with a degree, strong skills and many years of experience.",
      status: options.status ?? "SUBMITTED",
      ...(options.requirementSnapshot !== undefined
        ? { requirementSnapshot: options.requirementSnapshot }
        : {}),
    },
  });
}

export function formData(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    data.set(key, value);
  }
  return data;
}

export async function createTestDocumentType(
  options: {
    name?: string;
    description?: string;
    category?: string;
  } = {},
) {
  const name = options.name ?? `Document ${uniqueId("type")}`;
  return prisma.documentType.create({
    data: {
      name,
      description: options.description ?? "A reusable document type.",
      category: options.category ?? "General",
    },
  });
}

export async function createTestRequirement(options: {
  jobId: string;
  documentTypeId?: string | null;
  customName?: string | null;
  description?: string | null;
  requirementStatus?: "REQUIRED" | "OPTIONAL";
  displayOrder?: number;
}) {
  return prisma.jobDocumentRequirement.create({
    data: {
      jobId: options.jobId,
      documentTypeId: options.documentTypeId ?? null,
      customName: options.customName ?? null,
      description: options.description ?? null,
      requirementStatus: options.requirementStatus ?? "REQUIRED",
      displayOrder: options.displayOrder ?? 0,
    },
  });
}

/** A PDF buffer accepted by the file-type validation. */
export const TEST_PDF_BYTES = Buffer.from(
  "%PDF-1.7\n1 0 obj\n<<>>\nendobj\ntrailer\n%%EOF\n",
  "latin1",
);

/** Builds an in-memory `File` accepted by the upload actions. */
export function testFile(
  content: Buffer = TEST_PDF_BYTES,
  options: { name?: string; type?: string } = {},
): File {
  return new File([Uint8Array.from(content)], options.name ?? "cv.pdf", {
    type: options.type ?? "application/pdf",
  });
}

export async function createTestStagedDocument(options: {
  candidateId: string;
  jobId: string;
  requirementId: string;
  storageKey?: string;
  originalFileName?: string;
}) {
  return prisma.stagedDocument.create({
    data: {
      candidateId: options.candidateId,
      jobId: options.jobId,
      jobDocumentRequirementId: options.requirementId,
      storageKey:
        options.storageKey ??
        `documents/${options.candidateId}/${uniqueId("staged")}.pdf`,
      originalFileName: options.originalFileName ?? "cv.pdf",
      mimeType: "application/pdf",
      fileSize: TEST_PDF_BYTES.length,
    },
  });
}

export async function createTestApplicationDocument(options: {
  applicationId: string;
  requirementId?: string | null;
  requirementKey?: string | null;
  storageKey?: string;
  originalFileName?: string;
  reviewStatus?: "PENDING" | "ACCEPTED" | "REJECTED";
  reviewComment?: string | null;
}) {
  return prisma.applicationDocument.create({
    data: {
      applicationId: options.applicationId,
      jobDocumentRequirementId: options.requirementId ?? null,
      requirementKey: options.requirementKey ?? null,
      storageKey:
        options.storageKey ??
        `documents/test/${uniqueId("appdoc")}.pdf`,
      originalFileName: options.originalFileName ?? "cv.pdf",
      mimeType: "application/pdf",
      fileSize: TEST_PDF_BYTES.length,
      reviewStatus: options.reviewStatus ?? "PENDING",
      reviewComment: options.reviewComment ?? null,
    },
  });
}
