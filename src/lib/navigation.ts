import type { AppRole } from "./roles";

/** Landing page for a user based on their role. */
export function roleHome(role: AppRole): string {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "RECRUITER":
      return "/recruiter";
    case "CANDIDATE":
    default:
      return "/dashboard";
  }
}

export function isJobManager(role: AppRole): boolean {
  return role === "RECRUITER" || role === "ADMIN";
}
