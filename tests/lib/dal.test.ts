import { beforeEach, describe, expect, it } from "vitest";

import { getCurrentUser, requireRole, requireUser } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { resetRateLimits } from "@/lib/rate-limit";
import { createSession, getSession } from "@/lib/session";
import { SESSION_COOKIE_NAME } from "@/lib/session-core";
import { createTestUser } from "../harness/fixtures";
import { resetCookies, setCookie } from "../harness/cookies";

beforeEach(() => {
  resetCookies();
  resetRateLimits();
});

async function signInAs(user: {
  id: string;
  role: string;
  isActive?: boolean;
}): Promise<void> {
  await createSession({ userId: user.id, role: user.role });
}

describe("getCurrentUser", () => {
  it("returns null when no session cookie is present", async () => {
    expect(await getCurrentUser()).toBeNull();
  });

  it("returns the signed-in active user", async () => {
    const user = await createTestUser({ role: "RECRUITER", name: "Grace" });
    await signInAs(user);

    const current = await getCurrentUser();

    expect(current).not.toBeNull();
    expect(current?.id).toBe(user.id);
    expect(current?.name).toBe("Grace");
    expect(current?.role).toBe("RECRUITER");
    expect(current?.isActive).toBe(true);
  });

  it("ignores a forged role in the cookie and trusts the database", async () => {
    const user = await createTestUser({ role: "CANDIDATE" });

    // Attacker forges an ADMIN session token for a candidate account.
    setCookie(
      SESSION_COOKIE_NAME,
      await encryptAdminToken(user.id),
    );

    const current = await getCurrentUser();

    expect(current?.role).toBe("CANDIDATE");
  });

  it("returns null for a deactivated account even with a valid session", async () => {
    const user = await createTestUser({ role: "CANDIDATE", isActive: false });
    await signInAs(user);

    expect(await getCurrentUser()).toBeNull();
  });

  it("returns null for a session that points at a missing user", async () => {
    await createSession({ userId: "ghost-user", role: "ADMIN" });

    expect(await getCurrentUser()).toBeNull();
  });

  it("clears the session when the cookie is tampered with", async () => {
    const user = await createTestUser({ role: "CANDIDATE" });
    await signInAs(user);

    const token = await getSession();
    expect(token).not.toBeNull();
    setCookie(SESSION_COOKIE_NAME, "not-a-valid-jwt");

    expect(await getCurrentUser()).toBeNull();
  });
});

describe("requireUser and requireRole", () => {
  it("redirects to login when there is no session", async () => {
    await expect(requireUser()).rejects.toThrow("NEXT_REDIRECT:/login");
  });

  it("returns the user when signed in", async () => {
    const user = await createTestUser({ role: "CANDIDATE" });
    await signInAs(user);

    const current = await requireUser();
    expect(current.id).toBe(user.id);
  });

  it("redirects when the role is not allowed", async () => {
    const user = await createTestUser({ role: "CANDIDATE" });
    await signInAs(user);

    await expect(requireRole("ADMIN")).rejects.toThrow(
      "NEXT_REDIRECT:/dashboard?error=forbidden",
    );
  });

  it("returns the user when the role is allowed", async () => {
    const admin = await createTestUser({ role: "ADMIN" });
    await signInAs(admin);

    const current = await requireRole("ADMIN");
    expect(current.role).toBe("ADMIN");
  });
});

async function encryptAdminToken(userId: string): Promise<string> {
  const { encryptSession } = await import("@/lib/session-core");
  return encryptSession({ userId, role: "ADMIN" });
}

describe("session helpers", () => {
  it("round-trips createSession through getSession", async () => {
    const user = await createTestUser({ role: "CANDIDATE" });
    await signInAs(user);

    const session = await getSession();

    expect(session).toEqual({ userId: user.id, role: "CANDIDATE" });
    expect(await prisma.user.count({ where: { id: user.id } })).toBe(1);
  });
});
