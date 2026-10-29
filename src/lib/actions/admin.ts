"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ActionState, toFieldErrors } from "@/lib/definitions";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/dal";
import { ROLES } from "@/lib/roles";

function toObject(formData: FormData): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") result[key] = value;
  }
  return result;
}

async function requireAdmin(): Promise<
  { ok: true; adminId: string } | { ok: false; state: ActionState }
> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, state: { message: "You must be signed in." } };
  }
  if (user.role !== "ADMIN") {
    return {
      ok: false,
      state: { message: "You are not authorized to perform this action." },
    };
  }
  return { ok: true, adminId: user.id };
}

const updateRoleSchema = z.object({
  userId: z.string().min(1, "User is required."),
  role: z.enum(ROLES),
});

export async function updateUserRoleAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.state;

  const parsed = updateRoleSchema.safeParse(toObject(formData));
  if (!parsed.success) {
    return { errors: toFieldErrors(parsed.error) };
  }

  const { userId, role } = parsed.data;
  if (userId === auth.adminId) {
    return { message: "You cannot change your own role." };
  }

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) {
    return { message: "User not found." };
  }

  await prisma.user.update({ where: { id: userId }, data: { role } });

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  return { ok: true, message: `Role updated to ${role}.` };
}

const setActiveSchema = z.object({
  userId: z.string().min(1, "User is required."),
  isActive: z.enum(["true", "false"]),
});

export async function setUserActiveAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.state;

  const parsed = setActiveSchema.safeParse(toObject(formData));
  if (!parsed.success) {
    return { errors: toFieldErrors(parsed.error) };
  }

  const { userId, isActive } = parsed.data;
  if (userId === auth.adminId) {
    return { message: "You cannot deactivate your own account." };
  }

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) {
    return { message: "User not found." };
  }

  const nextActive = isActive === "true";
  await prisma.user.update({
    where: { id: userId },
    data: { isActive: nextActive },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  return {
    ok: true,
    message: nextActive
      ? "User account activated."
      : "User account deactivated. Active sessions are blocked immediately.",
  };
}

const assignRecruiterSchema = z.object({
  jobId: z.string().min(1, "Job is required."),
  recruiterEmail: z
    .string()
    .trim()
    .transform((value) => value.toLowerCase()),
});

export async function assignRecruiterAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.state;

  const parsed = assignRecruiterSchema.safeParse(toObject(formData));
  if (!parsed.success) {
    return { errors: toFieldErrors(parsed.error) };
  }

  const { jobId, recruiterEmail } = parsed.data;

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) {
    return { message: "Job vacancy not found." };
  }

  if (recruiterEmail === "") {
    await prisma.job.update({
      where: { id: jobId },
      data: { recruiterId: null },
    });
    revalidatePath("/admin/jobs");
    revalidatePath(`/recruiter/jobs/${jobId}`);
    return { ok: true, message: "Recruiter assignment cleared." };
  }

  const recruiter = await prisma.user.findUnique({
    where: { email: recruiterEmail },
  });
  if (!recruiter || recruiter.role !== "RECRUITER" || !recruiter.isActive) {
    return {
      message: "No active recruiter account matches that email address.",
    };
  }

  await prisma.job.update({
    where: { id: jobId },
    data: { recruiterId: recruiter.id },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/jobs");
  revalidatePath("/recruiter/jobs");
  revalidatePath(`/recruiter/jobs/${jobId}`);
  return { ok: true, message: `Assigned to ${recruiter.name}.` };
}
