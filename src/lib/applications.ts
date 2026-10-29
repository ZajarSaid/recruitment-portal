import "server-only";

import { prisma } from "./db";

export async function getApplicationForCandidate(
  candidateId: string,
  jobId: string,
) {
  return prisma.application.findUnique({
    where: { candidateId_jobId: { candidateId, jobId } },
    include: { job: true, evaluation: true, history: true },
  });
}

export type ApplicationStatus =
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "SHORTLISTED"
  | "REJECTED";

export type CandidateApplicationStatus = {
  id: string;
  status: ApplicationStatus;
  jobTitle: string;
  rejectionReason: string | null;
};

/**
 * Loads the minimal, candidate-facing view of a single application: the job
 * title and its current status only. Returns `null` when the application does
 * not exist or does not belong to the given candidate, so callers never leak
 * another candidate's application.
 *
 * When the application is rejected, the most recent rejection note (if any) is
 * surfaced as the reason shown to the candidate.
 */
export async function getCandidateApplicationStatus(
  applicationId: string,
  candidateId: string,
): Promise<CandidateApplicationStatus | null> {
  const application = await prisma.application.findFirst({
    where: { id: applicationId, candidateId },
    select: {
      id: true,
      status: true,
      job: { select: { title: true } },
    },
  });
  if (!application) return null;

  let rejectionReason: string | null = null;
  if (application.status === "REJECTED") {
    const rejection = await prisma.applicationStatusHistory.findFirst({
      where: { applicationId: application.id, toStatus: "REJECTED" },
      orderBy: { createdAt: "desc" },
      select: { note: true },
    });
    rejectionReason = rejection?.note?.trim() || null;
  }

  return {
    id: application.id,
    status: application.status as ApplicationStatus,
    jobTitle: application.job.title,
    rejectionReason,
  };
}
