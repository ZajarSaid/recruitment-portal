/**
 * Application roles. Kept as a plain string union (rather than importing the
 * Prisma enum) so lightweight modules such as the session layer and proxy
 * do not need to load the database client. Values match the `Role` enum in
 * `prisma/schema.prisma`.
 */
export const ROLES = ["CANDIDATE", "RECRUITER", "ADMIN"] as const;

export type AppRole = (typeof ROLES)[number];

export const ROLE_LABELS: Record<AppRole, string> = {
  CANDIDATE: "Candidate",
  RECRUITER: "Recruiter",
  ADMIN: "Administrator",
};

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

/** Roles allowed to create and manage job vacancies. */
export const JOB_MANAGER_ROLES: AppRole[] = ["RECRUITER", "ADMIN"];
