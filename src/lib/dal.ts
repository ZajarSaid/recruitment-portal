import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { prisma } from "./db";
import { ADMIN_SIGN_IN_PATH, isAdminHost } from "./admin-access";
import { getSession } from "./session";
import type { AppRole } from "./roles";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  isActive: boolean;
  createdAt: Date;
};

/**
 * Returns the authenticated, active user for the current request, or `null`.
 *
 * The session cookie only carries the user id and role. This function
 * re-reads the user from the database so that deactivated accounts or role
 * changes are enforced on the server immediately.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await getSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      activationTokenHash: true,
      createdAt: true,
    },
  });

  if (!user || !user.isActive) return null;
  const { activationTokenHash, ...currentUser } = user;
  if (user.role === "CANDIDATE" && activationTokenHash) return null;
  if (user.role === "ADMIN" &&
    (session.role !== "ADMIN" || !session.adminVerified || !isAdminHost((await headers()).get("host")))) {
    return null;
  }
  return currentUser;
});

/** Requires an authenticated user, otherwise redirects to the login page. */
export const requireUser = cache(async (): Promise<CurrentUser> => {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
});

/** Requires the user to have one of the given roles, otherwise redirects. */
export const requireRole = cache(
  async (...roles: AppRole[]): Promise<CurrentUser> => {
    const user = await getCurrentUser();
    if (!user) redirect(roles.length === 1 && roles[0] === "ADMIN" ? ADMIN_SIGN_IN_PATH : "/login");
    if (!roles.includes(user.role)) {
      redirect("/dashboard?error=forbidden");
    }
    return user;
  },
);
