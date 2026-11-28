"use server";

import { z } from "zod";

import { evaluateResume } from "@/lib/evaluation";
import { ActionState, toFieldErrors } from "@/lib/definitions";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/dal";
import { getJobAvailability, isAcceptingApplications } from "@/lib/jobs";
import {
  applicationLetterRequirement,
  buildRequirementSnapshot,
} from "@/lib/application-documents";
import { getProfileReadiness } from "@/lib/profile";
import { flashFeedback } from "@/lib/flash-feedback";
import { APPLICATION_LETTER_KEY } from "@/lib/profile-documents";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { scheduleApplicationSubmittedEmails } from "@/lib/email/application-emails";

// The resume summary is optional: candidates have already provided their
// education, experience and documents on their master profile, so the
// application only really needs the signed application letter.
const applySchema = z.object({
  jobId: z.string().min(1, "Job not specified."),
  resumeSummary: z
    .string()
    .trim()
    .max(10_000, "Resume summary must be at most 10000 characters long.")
    .optional(),
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

  const { jobId } = parsed.data;
  const resumeSummary = parsed.data.resumeSummary?.trim() ?? "";

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

  // Check the same score shown on the candidate's profile before submission.
  const { applicationRequirement } = await getProfileReadiness(user);
  if (applicationRequirement) {
    return { message: applicationRequirement };
  }

  // Validate that the signed application letter has been staged before
  // creating the application, so a partially uploaded submission can never
  // be created.
  const stagedLetter = await prisma.stagedDocument.findUnique({
    where: {
      candidateId_jobId_documentKey: {
        candidateId: user.id,
        jobId,
        documentKey: APPLICATION_LETTER_KEY,
      },
    },
    select: {
      storageKey: true,
      cloudUrl: true,
      originalFileName: true,
      mimeType: true,
      fileSize: true,
    },
  });
  if (!stagedLetter) {
    return {
      message:
        "Please upload your signed application letter before submitting.",
    };
  }

  const requirementSnapshot = buildRequirementSnapshot([
    applicationLetterRequirement(),
  ]);

  try {
    const created = await prisma.$transaction(async (tx) => {
      const application = await tx.application.create({
        data: {
          candidateId: user.id,
          jobId: job.id,
          resumeSummary,
          status: "SUBMITTED",
          requirementSnapshot,
        },
      });

      // The deterministic summary score only makes sense when a summary
      // was provided.
      if (resumeSummary.length > 0) {
        const evaluation = evaluateResume(resumeSummary);
        await tx.applicationEvaluation.create({
          data: {
            applicationId: application.id,
            score: evaluation.score,
            method: evaluation.method,
            notes: evaluation.notes,
          },
        });
      }

      await tx.applicationStatusHistory.create({
        data: {
          applicationId: application.id,
          fromStatus: null,
          toStatus: "SUBMITTED",
          actorId: user.id,
          note: "Application submitted by candidate.",
        },
      });

      await tx.applicationDocument.create({
        data: {
          applicationId: application.id,
          documentKey: APPLICATION_LETTER_KEY,
          requirementKey: APPLICATION_LETTER_KEY,
          storageKey: stagedLetter.storageKey,
          cloudUrl: stagedLetter.cloudUrl,
          originalFileName: stagedLetter.originalFileName,
          mimeType: stagedLetter.mimeType,
          fileSize: stagedLetter.fileSize,
        },
      });

      await tx.stagedDocument.deleteMany({
        where: { candidateId: user.id, jobId },
      });

      return {
        applicationId: application.id,
        submittedAt: application.submittedAt,
      };
    });

    // Kick off the notification emails without blocking the response.
    scheduleApplicationSubmittedEmails({
      applicationId: created.applicationId,
      candidate: { name: user.name, email: user.email },
      job: {
        id: job.id,
        title: job.title,
        department: job.department,
        location: job.location,
      },
      submittedAt: created.submittedAt,
    });
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code;
    if (code === "P2002") {
      return { message: "You have already applied for this job vacancy." };
    }
    return { message: "Failed to submit application. Please try again." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/profile");
  revalidatePath(`/jobs/${jobId}`);

  await flashFeedback("application-submitted");
  redirect("/dashboard");
}
