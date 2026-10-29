import "server-only";

import type { Prisma } from "@/generated/prisma/client";

import { prisma } from "./db";
import {
  documentRequirementsSchema,
  type DocumentRequirementInput,
  type FieldErrors,
} from "./definitions";

/** Prisma client or an interactive-transaction client. */
type Db = Prisma.TransactionClient;

export type NormalizedRequirement = {
  id?: string;
  documentTypeId: string | null;
  customName: string | null;
  description: string | null;
  requirementStatus: "REQUIRED" | "OPTIONAL";
};

export type ParseResult =
  | { ok: true; data: NormalizedRequirement[] }
  | { ok: false; errors: FieldErrors };

const FIELD = "documentRequirements";

/**
 * Parses the `documentRequirements` JSON field produced by the vacancy form.
 * An absent or empty value means "no requirements" and is valid, preserving
 * the existing workflow for vacancies without attachments.
 */
export function parseRequirementsField(
  raw: FormDataEntryValue | null,
): ParseResult {
  if (raw === null || (typeof raw === "string" && raw.trim() === "")) {
    return { ok: true, data: [] };
  }
  if (typeof raw !== "string") {
    return { ok: false, errors: { [FIELD]: ["Invalid document requirements."] } };
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return {
      ok: false,
      errors: { [FIELD]: ["Invalid document requirements payload."] },
    };
  }

  const parsed = documentRequirementsSchema.safeParse(json);
  if (!parsed.success) {
    return {
      ok: false,
      errors: { [FIELD]: [parsed.error.issues[0]?.message ?? "Invalid document requirements."] },
    };
  }

  const data: NormalizedRequirement[] = [];
  for (const item of parsed.data as DocumentRequirementInput[]) {
    const documentTypeId = item.documentTypeId?.trim() || null;
    const customName = item.customName?.trim() || null;
    if (!documentTypeId && !customName) {
      return {
        ok: false,
        errors: {
          [FIELD]: [
            "Each document requirement needs a document type or a custom name.",
          ],
        },
      };
    }
    data.push({
      id: item.id,
      documentTypeId,
      customName,
      description: item.description?.trim() || null,
      requirementStatus: item.requirementStatus,
    });
  }

  return { ok: true, data };
}

async function assertDocumentTypesExist(
  db: Db,
  requirements: NormalizedRequirement[],
): Promise<void> {
  const ids = [
    ...new Set(
      requirements
        .map((requirement) => requirement.documentTypeId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  if (ids.length === 0) return;

  const found = await db.documentType.findMany({
    where: { id: { in: ids } },
    select: { id: true },
  });
  if (found.length !== ids.length) {
    throw new RequirementSyncError(
      "One or more selected document types no longer exist. Reload and try again.",
    );
  }
}

export class RequirementSyncError extends Error {}

/**
 * Reconciles a vacancy's requirements with the submitted list.
 *
 * Existing rows are updated in place (preserving their ids so any documents
 * already linked to them keep their reference), rows omitted from the payload
 * are removed, and new rows are created. Display order follows the array.
 */
export async function syncJobRequirements(
  db: Db,
  jobId: string,
  requirements: NormalizedRequirement[],
): Promise<void> {
  await assertDocumentTypesExist(db, requirements);

  const existing = await db.jobDocumentRequirement.findMany({
    where: { jobId },
    select: { id: true },
  });
  const existingIds = new Set(existing.map((row) => row.id));

  const keptIds = new Set(
    requirements
      .map((requirement) => requirement.id)
      .filter((id): id is string => Boolean(id) && existingIds.has(id as string)),
  );
  const removedIds = [...existingIds].filter((id) => !keptIds.has(id));
  if (removedIds.length > 0) {
    await db.jobDocumentRequirement.deleteMany({
      where: { id: { in: removedIds } },
    });
  }

  for (let index = 0; index < requirements.length; index += 1) {
    const requirement = requirements[index];
    const data = {
      documentTypeId: requirement.documentTypeId,
      customName: requirement.customName,
      description: requirement.description,
      requirementStatus: requirement.requirementStatus,
      displayOrder: index,
    };

    if (requirement.id && existingIds.has(requirement.id)) {
      await db.jobDocumentRequirement.update({
        where: { id: requirement.id },
        data,
      });
    } else {
      await db.jobDocumentRequirement.create({
        data: { ...data, jobId },
      });
    }
  }
}

/** A requirement's display name: its custom name or catalogue type name. */
export function requirementLabel(requirement: {
  customName: string | null;
  documentType: { name: string } | null;
}): string {
  return (
    requirement.customName?.trim() ||
    requirement.documentType?.name ||
    "Document"
  );
}

/** Loads a vacancy's requirements in display order. */
export async function listJobRequirements(jobId: string) {
  return prisma.jobDocumentRequirement.findMany({
    where: { jobId },
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    include: { documentType: { select: { id: true, name: true } } },
  });
}

/** Loads the reusable document-type catalogue for selection in forms. */
export async function listDocumentTypes() {
  return prisma.documentType.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
    select: { id: true, name: true, category: true },
  });
}
