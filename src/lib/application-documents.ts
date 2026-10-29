import "server-only";

import { prisma } from "./db";
import type { CurrentUser } from "./dal";
import { canManageJob } from "./jobs";
import { requirementLabel } from "./job-documents";

/** Review states a document can be in. Mirrors `DocumentReviewStatus`. */
export type DocumentReviewStatus = "PENDING" | "ACCEPTED" | "REJECTED";

/** Effective status of a requirement, including "not submitted". */
export type RequirementStatus = "MISSING" | DocumentReviewStatus;

export type RequirementView = {
  id: string;
  label: string;
  description: string | null;
  requirementStatus: "REQUIRED" | "OPTIONAL";
};

/**
 * A requirement as frozen onto an application at submission time. `displayOrder`
 * is kept so the recruiter sees the same ordering the candidate did.
 */
export type SnapshotRequirement = RequirementView & { displayOrder: number };

/** A live `JobDocumentRequirement` row, as returned by `listJobRequirements`. */
export type RequirementSource = {
  id: string;
  customName: string | null;
  description: string | null;
  requirementStatus: string;
  displayOrder: number;
  documentType: { name: string } | null;
};

/** A document row, normalised to the fields needed for matching. */
export type DocumentSource = {
  id: string;
  jobDocumentRequirementId: string | null;
  requirementKey?: string | null;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  reviewStatus: string;
  reviewComment: string | null;
  cloudUrl?: string | null;
};

function normalizeRequirementStatus(value: string): "REQUIRED" | "OPTIONAL" {
  return value === "OPTIONAL" ? "OPTIONAL" : "REQUIRED";
}

function toRequirementView(requirement: RequirementSource): RequirementView {
  return {
    id: requirement.id,
    label: requirementLabel(requirement),
    description: requirement.description,
    requirementStatus: normalizeRequirementStatus(requirement.requirementStatus),
  };
}

/**
 * Freezes a vacancy's requirements into the immutable form stored on an
 * application. Called once, inside the submission transaction.
 */
export function buildRequirementSnapshot(
  requirements: RequirementSource[],
): SnapshotRequirement[] {
  return [...requirements]
    .sort(
      (a, b) =>
        a.displayOrder - b.displayOrder || a.id.localeCompare(b.id),
    )
    .map((requirement, index) => ({
      ...toRequirementView(requirement),
      displayOrder: index,
    }));
}

/**
 * Reads a stored snapshot, tolerating the JSON round-trip. Returns `null` when
 * the value is not an array (a legacy application that predates snapshots);
 * an empty array is a meaningful "this vacancy required no documents".
 */
export function parseRequirementSnapshot(
  value: unknown,
): SnapshotRequirement[] | null {
  if (!Array.isArray(value)) return null;
  const result: SnapshotRequirement[] = [];
  value.forEach((entry, index) => {
    if (!entry || typeof entry !== "object") return;
    const record = entry as Record<string, unknown>;
    if (typeof record.id !== "string" || typeof record.label !== "string") return;
    result.push({
      id: record.id,
      label: record.label,
      description:
        typeof record.description === "string" ? record.description : null,
      requirementStatus: normalizeRequirementStatus(
        typeof record.requirementStatus === "string"
          ? record.requirementStatus
          : "REQUIRED",
      ),
      displayOrder:
        typeof record.displayOrder === "number" ? record.displayOrder : index,
    });
  });
  return result.sort((a, b) => a.displayOrder - b.displayOrder);
}

/**
 * Decides which requirements apply to an application. Snapshots win: editing or
 * deleting a vacancy's requirements after submission never changes what the
 * candidate was judged against. For legacy applications (no snapshot) we show
 * only the requirements they actually attached documents to, so they are never
 * flagged for documents that were not required when they applied.
 */
export function resolveRequirementViews(
  application: { requirementSnapshot: unknown },
  liveRequirements: RequirementSource[],
  documents: Array<Pick<DocumentSource, "jobDocumentRequirementId" | "requirementKey">>,
): RequirementView[] {
  const snapshot = parseRequirementSnapshot(application.requirementSnapshot);
  if (snapshot !== null) {
    return snapshot.map(({ id, label, description, requirementStatus }) => ({
      id,
      label,
      description,
      requirementStatus,
    }));
  }

  const documentKeys = new Set(
    documents
      .map((document) => document.requirementKey ?? document.jobDocumentRequirementId)
      .filter((key): key is string => Boolean(key)),
  );
  return liveRequirements
    .filter((requirement) => documentKeys.has(requirement.id))
    .map(toRequirementView);
}

export type DocumentView = {
  id: string;
  requirementId: string | null;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  reviewStatus: DocumentReviewStatus;
  reviewComment: string | null;
  cloudUrl: string | null;
};
export type RequirementDocumentSummary = RequirementView & {
  document: DocumentView | null;
  status: RequirementStatus;
};

export type ApplicationDocumentSummary = {
  requirements: RequirementDocumentSummary[];
  /** Documents not tied to any currently configured requirement. */
  extra: DocumentView[];
  requiredCount: number;
  requiredSubmitted: number;
  missingRequired: number;
  pendingCount: number;
  acceptedCount: number;
  rejectedCount: number;
  allRequiredSubmitted: boolean;
  allRequiredAccepted: boolean;
};

function toDocumentView(document: DocumentSource): DocumentView {
  return {
    id: document.id,
    // Prefer the immutable snapshot key so a document keeps its place even
    // after the linked requirement row is edited or removed.
    requirementId:
      document.requirementKey ?? document.jobDocumentRequirementId,
    originalFileName: document.originalFileName,
    mimeType: document.mimeType,
    fileSize: document.fileSize,
    reviewStatus: document.reviewStatus as DocumentReviewStatus,
    reviewComment: document.reviewComment,
    cloudUrl: document.cloudUrl ?? null,
  };
}

/**
 * Combines an application's effective requirements with the documents it was
 * submitted with. This is the single source of truth for the "are all mandatory
 * documents present?" question that both the candidate and the reviewing
 * recruiter see. Callers pass the requirements resolved by
 * `resolveRequirementViews` (snapshot for new applications, safe fallback for
 * legacy ones).
 */
export function summarizeApplicationDocuments(
  requirements: RequirementView[],
  documents: DocumentSource[],
): ApplicationDocumentSummary {
  const byRequirement = new Map<string, DocumentView>();
  const extra: DocumentView[] = [];
  const requirementIds = new Set(requirements.map((requirement) => requirement.id));

  for (const document of documents) {
    const view = toDocumentView(document);
    if (view.requirementId && requirementIds.has(view.requirementId)) {
      byRequirement.set(view.requirementId, view);
    } else {
      extra.push(view);
    }
  }

  const items: RequirementDocumentSummary[] = requirements.map((requirement) => {
    const document = byRequirement.get(requirement.id) ?? null;
    return {
      id: requirement.id,
      label: requirement.label,
      description: requirement.description,
      requirementStatus: requirement.requirementStatus,
      document,
      status: document ? document.reviewStatus : "MISSING",
    };
  });

  const required = items.filter((item) => item.requirementStatus === "REQUIRED");
  const requiredSubmitted = required.filter((item) => item.document).length;
  const allRequiredSubmitted = requiredSubmitted === required.length;
  const allRequiredAccepted =
    allRequiredSubmitted &&
    required.every((item) => item.document?.reviewStatus === "ACCEPTED");

  const allDocuments = [...byRequirement.values(), ...extra];
  const pendingCount = allDocuments.filter(
    (document) => document.reviewStatus === "PENDING",
  ).length;
  const acceptedCount = allDocuments.filter(
    (document) => document.reviewStatus === "ACCEPTED",
  ).length;
  const rejectedCount = allDocuments.filter(
    (document) => document.reviewStatus === "REJECTED",
  ).length;

  return {
    requirements: items,
    extra,
    requiredCount: required.length,
    requiredSubmitted,
    missingRequired: required.length - requiredSubmitted,
    pendingCount,
    acceptedCount,
    rejectedCount,
    allRequiredSubmitted,
    allRequiredAccepted,
  };
}

/** Loads the documents a candidate has staged for an unsubmitted application. */
export async function listStagedDocuments(
  candidateId: string,
  jobId: string,
) {
  return prisma.stagedDocument.findMany({
    where: { candidateId, jobId },
    select: {
      id: true,
      jobDocumentRequirementId: true,
      originalFileName: true,
      mimeType: true,
      fileSize: true,
      cloudUrl: true,
    },
  });
}

/**
 * Loads a document for download only if the requesting user is allowed to see
 * it: the candidate who owns the application, or a recruiter/administrator who
 * manages the vacancy. Returns `null` when the document does not exist or the
 * user is not authorized, so callers can respond with a generic 404 and avoid
 * leaking the existence of other candidates' documents.
 */
export async function getAccessibleApplicationDocument(
  documentId: string,
  applicationId: string,
  user: Pick<CurrentUser, "id" | "role">,
) {
  const document = await prisma.applicationDocument.findUnique({
    where: { id: documentId },
    select: {
      id: true,
      storageKey: true,
      cloudUrl: true,
      originalFileName: true,
      mimeType: true,
      fileSize: true,
      applicationId: true,
      application: {
        select: {
          candidateId: true,
          job: { select: { createdById: true, recruiterId: true } },
        },
      },
    },
  });
  if (!document) return null;
  if (document.applicationId !== applicationId) return null;

  const isOwner = document.application.candidateId === user.id;
  const isManager = canManageJob(user, document.application.job);
  if (!isOwner && !isManager) return null;

  return {
    id: document.id,
    storageKey: document.storageKey,
    cloudUrl: document.cloudUrl,
    originalFileName: document.originalFileName,
    mimeType: document.mimeType,
    fileSize: document.fileSize,
  };
}
