"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  jobSchema,
  toFieldErrors,
  type ActionState,
} from "@/lib/definitions";
import { prisma } from "@/lib/db";
import { getCurrentUser, type CurrentUser } from "@/lib/dal";
import { canManageJob } from "@/lib/jobs";
import {
  parseRequirementsField,
  RequirementSyncError,
  syncJobRequirements,
} from "@/lib/job-documents";
import { isJobManager } from "@/lib/navigation";

type JobStatusValue = "DRAFT" | "PUBLISHED" | "CLOSED";

const ALLOWED_TRANSITIONS: Record<JobStatusValue, JobStatusValue[]> = {
  DRAFT: ["PUBLISHED", "CLOSED"],
  PUBLISHED: ["CLOSED"],
  CLOSED: ["PUBLISHED"],
};

function objectFromFormData(formData: FormData): Record<string, string> {
  const data: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") {
      data[key] = value;
    }
  }
  return data;
}

function revalidateJobSurfaces(jobId?: string): void {
  revalidatePath("/jobs");
  revalidatePath("/recruiter/jobs");
  if (jobId) {
    revalidatePath(`/recruiter/jobs/${jobId}`);
    revalidatePath(`/jobs/${jobId}`);
  }
}

async function authorizeJobManager(): Promise<
  { ok: true; user: CurrentUser } | { ok: false; state: ActionState }
> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      ok: false,
      state: { message: "You must be signed in to manage job vacancies." },
    };
  }
  if (!isJobManager(user.role)) {
    return {
      ok: false,
      state: { message: "You are not authorized to manage job vacancies." },
    };
  }
  return { ok: true, user };
}

export async function createJobAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const auth = await authorizeJobManager();
  if (!auth.ok) return auth.state;

  const parsed = jobSchema.safeParse(objectFromFormData(formData));
  if (!parsed.success) {
    return { errors: toFieldErrors(parsed.error) };
  }

  const requirements = parseRequirementsField(
    formData.get("documentRequirements"),
  );
  if (!requirements.ok) {
    return { errors: requirements.errors };
  }

  const data = parsed.data;
  const requestedStatus: JobStatusValue =
    formData.get("status") === "PUBLISHED" ? "PUBLISHED" : "DRAFT";

  let jobId: string;
  try {
    jobId = await prisma.$transaction(async (tx) => {
      const job = await tx.job.create({
        data: {
          title: data.title,
          department: data.department,
          location: data.location,
          description: data.description,
          qualifications: data.qualifications,
          opensAt: data.opensAt,
          closesAt: data.closesAt,
          status: requestedStatus,
          createdById: auth.user.id,
          recruiterId: auth.user.role === "RECRUITER" ? auth.user.id : null,
        },
      });

      if (requirements.data.length > 0) {
        await syncJobRequirements(tx, job.id, requirements.data);
      }

      return job.id;
    });
  } catch (error: unknown) {
    if (error instanceof RequirementSyncError) {
      return { errors: { documentRequirements: [error.message] } };
    }
    throw error;
  }

  revalidateJobSurfaces(jobId);
  redirect(`/recruiter/jobs/${jobId}`);
}

export async function updateJobAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const auth = await authorizeJobManager();
  if (!auth.ok) return auth.state;

  const id = String(formData.get("id") ?? "");
  if (!id) return { message: "Missing job identifier." };

  const existing = await prisma.job.findUnique({ where: { id } });
  if (!existing) return { message: "Job vacancy not found." };
  if (!canManageJob(auth.user, existing)) {
    return { message: "You are not authorized to edit this job vacancy." };
  }

  const parsed = jobSchema.safeParse(objectFromFormData(formData));
  if (!parsed.success) {
    return { errors: toFieldErrors(parsed.error) };
  }

  const requirements = parseRequirementsField(
    formData.get("documentRequirements"),
  );
  if (!requirements.ok) {
    return { errors: requirements.errors };
  }

  const data = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.job.update({
        where: { id },
        data: {
          title: data.title,
          department: data.department,
          location: data.location,
          description: data.description,
          qualifications: data.qualifications,
          opensAt: data.opensAt,
          closesAt: data.closesAt,
        },
      });

      await syncJobRequirements(tx, id, requirements.data);
    });
  } catch (error: unknown) {
    if (error instanceof RequirementSyncError) {
      return { errors: { documentRequirements: [error.message] } };
    }
    throw error;
  }

  revalidateJobSurfaces(id);
  redirect(`/recruiter/jobs/${id}`);
}

export async function setJobStatusAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const auth = await authorizeJobManager();
  if (!auth.ok) return auth.state;

  const id = String(formData.get("id") ?? "");
  const nextStatusRaw = String(formData.get("status") ?? "");
  const nextStatus = nextStatusRaw as JobStatusValue;

  if (!id) return { message: "Missing job identifier." };
  if (!["DRAFT", "PUBLISHED", "CLOSED"].includes(nextStatusRaw)) {
    return { message: "Invalid job status." };
  }

  const existing = await prisma.job.findUnique({ where: { id } });
  if (!existing) return { message: "Job vacancy not found." };
  if (!canManageJob(auth.user, existing)) {
    return { message: "You are not authorized to change this job vacancy." };
  }

  const allowed = ALLOWED_TRANSITIONS[existing.status];
  if (!allowed.includes(nextStatus)) {
    return {
      message: `Cannot change a ${existing.status} job to ${nextStatus}.`,
    };
  }

  await prisma.job.update({
    where: { id },
    data: { status: nextStatus },
  });

  revalidateJobSurfaces(id);
  return { ok: true, message: `Job vacancy is now ${nextStatus}.` };
}
