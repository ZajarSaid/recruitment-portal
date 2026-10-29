import "server-only";

import { prisma } from "./db";
import type { CurrentUser } from "./dal";
import type { Prisma } from "@/generated/prisma/client";

export type JobAvailability = "UPCOMING" | "OPEN" | "CLOSED";

type JobTiming = {
  status: string;
  opensAt: Date;
  closesAt: Date;
};

/**
 * Availability is derived from the persisted status and the application
 * window. Only PUBLISHED jobs inside their window accept applications.
 */
export function getJobAvailability(
  job: JobTiming,
  now: Date = new Date(),
): JobAvailability {
  if (job.status !== "PUBLISHED") return "CLOSED";
  if (now.getTime() < job.opensAt.getTime()) return "UPCOMING";
  if (now.getTime() > job.closesAt.getTime()) return "CLOSED";
  return "OPEN";
}

export function isAcceptingApplications(
  job: JobTiming,
  now: Date = new Date(),
): boolean {
  return getJobAvailability(job, now) === "OPEN";
}

export function canManageJob(
  user: Pick<CurrentUser, "id" | "role">,
  job: { createdById: string; recruiterId: string | null },
): boolean {
  if (user.role === "ADMIN") return true;
  if (user.role !== "RECRUITER") return false;
  return job.createdById === user.id || job.recruiterId === user.id;
}

export async function listPublicJobs(filters: {
  q?: string;
  department?: string;
} = {}) {
  const where: Prisma.JobWhereInput = {
    status: "PUBLISHED",
    closesAt: { gte: new Date() },
  };

  const q = filters.q?.trim();
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { department: { contains: q } },
      { location: { contains: q } },
    ];
  }

  if (filters.department?.trim()) {
    where.department = filters.department.trim();
  }

  return prisma.job.findMany({
    where,
    orderBy: [{ closesAt: "asc" }, { createdAt: "desc" }],
  });
}

export async function listPublicDepartments(): Promise<string[]> {
  const rows = await prisma.job.findMany({
    where: { status: "PUBLISHED", closesAt: { gte: new Date() } },
    distinct: ["department"],
    select: { department: true },
    orderBy: { department: "asc" },
  });
  return rows.map((row) => row.department);
}

/** Returns a job only if it is publicly visible (PUBLISHED). */
export async function getPublicJob(id: string) {
  return prisma.job.findFirst({
    where: { id, status: "PUBLISHED" },
  });
}

export async function listManagedJobs(user: CurrentUser) {
  const where: Prisma.JobWhereInput =
    user.role === "ADMIN"
      ? {}
      : { OR: [{ createdById: user.id }, { recruiterId: user.id }] };

  return prisma.job.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      _count: {
        select: { applications: true, documentRequirements: true },
      },
      createdBy: { select: { id: true, name: true } },
      recruiter: { select: { id: true, name: true } },
    },
  });
}

export async function getManagedJob(id: string, user: CurrentUser) {
  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) return null;
  if (!canManageJob(user, job)) return null;
  return job;
}
