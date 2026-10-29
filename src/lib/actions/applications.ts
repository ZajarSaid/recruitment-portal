"use server";

import { z } from "zod";

import { evaluateResume } from "@/lib/evaluation";
import { ActionState, toFieldErrors } from "@/lib/definitions";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/dal";
import { getJobAvailability, isAcceptingApplications } from "@/lib/jobs";
import { buildRequirementSnapshot } from "@/lib/application-documents";
import { listJobRequirements, requirementLabel } from "@/lib/job-documents";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const applySchema = z.object({
  jobId: z.string().min(1, "Job not specified."),
  resumeSummary: z
    .string()
    .trim()
    .min(20, "Resume summary must be at least 20 characters long.")
    .max(10_000, "Resume summary must be at most 10000 characters long."),
  photoUrl: z.string().trim().max(512).optional(),
  photoPublicId: z.string().trim().max(255).optional(),
});

function formDataToObject(formData: FormData): Record<string, string> {
  const obj: Record<string, string> = {};
  for (const [k, v] of formData.entries()) {
    if (typeof v === "string") obj[k] = v;
  }
  return obj;
}

export async function applyToJobAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) {
    return { message: "You must be signed in to apply for a job." };
  }
  if (user.role !== "CANDIDATE") {
    return { message: "Only candidates can submit job applications." };
  }

  const parsed = applySchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { errors: toFieldErrors(parsed.error) };
  }

  const { jobId, resumeSummary } = parsed.data;
  const photoUrl = parsed.data.photoUrl || null;
  const photoPublicId = parsed.data.photoPublicId || null;

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) {
    return { message: "Job vacancy not found." };
  }
  if (!isAcceptingApplications(job)) {
    const avail = getJobAvailability(job);
    if (avail === "UPCOMING") {
      return { message: "Applications for this job are not yet open." };
    }
    return { message: "Applications for this job are closed." };
  }

  const existing = await prisma.application.findUnique({
    where: { candidateId_jobId: { candidateId: user.id, jobId } },
  });
  if (existing) {
    return { message: "You have already applied for this job vacancy." };
  }

  // Validate that every mandatory document has been staged before creating the
  // application, so a partially uploaded submission can never be created.
  const [requirements, staged] = await Promise.all([
    listJobRequirements(jobId),
    prisma.stagedDocument.findMany({
      where: { candidateId: user.id, jobId },
      select: {
        storageKey: true,
        cloudUrl: true,
        originalFileName: true,
        mimeType: true,
        fileSize: true,
        jobDocumentRequirementId: true,
      },
    }),
  ]);

  const stagedByRequirement = new Map(
    staged.map((document) => [document.jobDocumentRequirementId, document]),
  );

  const missing = requirements.filter(
    (requirement) =>
      requirement.requirementStatus === "REQUIRED" &&
      !stagedByRequirement.has(requirement.id),
  );
  if (missing.length > 0) {
    const names = missing.map((requirement) => requirementLabel(requirement));
    return {
      message: `Please upload all required documents before submitting: ${names.join(
        ", ",
      )}.`,
    };
  }

  const evaluation = evaluateResume(resumeSummary);
  const requirementSnapshot = buildRequirementSnapshot(requirements);

  try {
    await prisma.$transaction(async (tx) => {
      const application = await tx.application.create({
        data: {
          candidateId: user.id,
          jobId: job.id,
          resumeSummary,
          status: "SUBMITTED",
          requirementSnapshot,
          photoUrl,
          photoPublicId,
        },
      });

      await tx.applicationEvaluation.create({
        data: {
          applicationId: application.id,
          score: evaluation.score,
          method: evaluation.method,
          notes: evaluation.notes,
        },
      });

      await tx.applicationStatusHistory.create({
        data: {
          applicationId: application.id,
          fromStatus: null,
          toStatus: "SUBMITTED",
          actorId: user.id,
          note: "Application submitted by candidate.",
        },
      });

      if (staged.length > 0) {
        await tx.applicationDocument.createMany({
          data: staged.map((document) => ({
            applicationId: application.id,
            jobDocumentRequirementId: document.jobDocumentRequirementId,
            requirementKey: document.jobDocumentRequirementId,
            storageKey: document.storageKey,
            cloudUrl: document.cloudUrl,
            originalFileName: document.originalFileName,
            mimeType: document.mimeType,
            fileSize: document.fileSize,
          })),
        });
        await tx.stagedDocument.deleteMany({
          where: { candidateId: user.id, jobId },
        });
      }
    });
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code;
    if (code === "P2002") {
      return { message: "You have already applied for this job vacancy." };
    }
    return { message: "Failed to submit application. Please try again." };
  }

  revalidatePath("/dashboard");
  revalidatePath(`/jobs/${jobId}`);
  redirect("/dashboard");
}
