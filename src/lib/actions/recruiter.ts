"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ActionState, toFieldErrors } from "@/lib/definitions";
import { prisma } from "@/lib/db";
import { getCurrentUser, type CurrentUser } from "@/lib/dal";
import { isJobManager } from "@/lib/navigation";
import { canManageJob } from "@/lib/jobs";
import { scheduleApplicationShortlistedEmail } from "@/lib/email/application-emails";

const APPLICATION_STATUSES = ["SUBMITTED", "UNDER_REVIEW", "SHORTLISTED", "REJECTED"] as const;
type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

const updateStatusSchema = z.object({
  applicationId: z.string().min(1),
  toStatus: z.enum(APPLICATION_STATUSES),
  note: z.string().trim().max(1000).optional(),
});

const ALLOWED_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  SUBMITTED: ["UNDER_REVIEW", "SHORTLISTED", "REJECTED"],
  UNDER_REVIEW: ["SHORTLISTED", "REJECTED"],
  SHORTLISTED: ["REJECTED", "UNDER_REVIEW"],
  REJECTED: ["UNDER_REVIEW", "SHORTLISTED"],
};

function toObject(fd: FormData): Record<string, string> {
  const o: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === "string") o[k] = v;
  return o;
}

async function authorizeJobManager(): Promise<
  { ok: true; user: CurrentUser } | { ok: false; state: ActionState }
> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, state: { message: "Not authenticated" } };
  if (!isJobManager(user.role)) return { ok: false, state: { message: "Not authorized" } };
  return { ok: true, user };
}

export async function updateApplicationStatusAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const auth = await authorizeJobManager();
  if (!auth.ok) return auth.state;
  const user = auth.user;

  const parsed = updateStatusSchema.safeParse(toObject(formData));
  if (!parsed.success) {
    return { errors: toFieldErrors(parsed.error) };
  }

  const { applicationId, toStatus, note } = parsed.data;

  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      job: true,
      candidate: { select: { name: true, email: true } },
    },
  });
  if (!app) return { message: "Application not found." };
  if (!canManageJob(user, app.job)) {
    return { message: "Not authorized to manage this application." };
  }

  const fromStatus = app.status as ApplicationStatus;
  const allowed = ALLOWED_TRANSITIONS[fromStatus] || [];
  if (!allowed.includes(toStatus as ApplicationStatus)) {
    return { message: `Cannot transition from ${fromStatus} to ${toStatus}.` };
  }

  await prisma.$transaction(async (tx) => {
    await tx.application.update({
      where: { id: app.id },
      data: { status: toStatus },
    });
    await tx.applicationStatusHistory.create({
      data: {
        applicationId: app.id,
        fromStatus,
        toStatus,
        actorId: user.id,
        note: note || undefined,
      },
    });
  });

  revalidatePath(`/recruiter/jobs/${app.jobId}`);
  revalidatePath(`/recruiter/applications/${app.id}`);

  // When an application is shortlisted the candidate must receive the
  // "prepare for an interview" notification. Scheduled through `after` so
  // the status response itself is not delayed by mail delivery.
  if (toStatus === "SHORTLISTED") {
    scheduleApplicationShortlistedEmail(
      {
        applicationId: app.id,
        candidate: { name: app.candidate.name, email: app.candidate.email },
        job: {
          id: app.job.id,
          title: app.job.title,
          department: app.job.department,
          location: app.job.location,
        },
        submittedAt: app.submittedAt,
      },
      note,
    );
  }

  return { ok: true, message: `Status updated to ${toStatus}.` };
}
