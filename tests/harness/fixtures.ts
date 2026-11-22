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
  category?: "GENERAL" | "MEDICINE" | "IT" | "BUSINESS";
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
      category: options.category ?? "GENERAL",
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

/** Creates a complete candidate master profile (GENERAL category by default). */
export async function createTestProfile(
  options: {
    userId: string;
    educationLevel?:
      | "NONE"
      | "PRIMARY"
      | "SECONDARY"
      | "CERTIFICATE"
      | "DIPLOMA"
      | "BACHELOR"
      | "MASTER"
      | "DOCTORATE";
    birthYear?: number;
    birthMonth?: number;
    physicalAddress?: string;
    computerLiteracy?: "BASIC" | "INTERMEDIATE" | "ADVANCED";
    languages?: string;
    category?: "GENERAL" | "MEDICINE" | "IT" | "BUSINESS";
  } = { userId: "" },
) {
  return prisma.candidateProfile.create({
    data: {
      userId: options.userId,
      educationLevel: options.educationLevel ?? "BACHELOR",
      birthYear: options.birthYear ?? 1995,
      birthMonth: options.birthMonth ?? 6,
      physicalAddress:
        options.physicalAddress ?? "Plot 1, Test Street, Dodoma",
      computerLiteracy: options.computerLiteracy ?? "INTERMEDIATE",
      languages: options.languages ?? "Kiswahili, English",
      category: options.category ?? "GENERAL",
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
  documentKey: string;
  storageKey?: string;
  originalFileName?: string;
}) {
  return prisma.stagedDocument.create({
    data: {
      candidateId: options.candidateId,
      jobId: options.jobId,
      documentKey: options.documentKey,
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
  documentKey?: string | null;
  requirementKey?: string | null;
  storageKey?: string;
  originalFileName?: string;
  reviewStatus?: "PENDING" | "ACCEPTED" | "REJECTED";
  reviewComment?: string | null;
}) {
  return prisma.applicationDocument.create({
    data: {
      applicationId: options.applicationId,
      documentKey: options.documentKey ?? null,
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
