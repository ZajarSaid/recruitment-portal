import { beforeEach, describe, expect, it } from "vitest";

import { GET as checkBrowserSession } from "@/app/api/session/route";
import { getCurrentUser, requireRole, requireUser } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { resetRateLimits } from "@/lib/rate-limit";
import { createSession, deleteSession, getSession } from "@/lib/session";
import { SESSION_COOKIE_NAME } from "@/lib/session-core";
import { createTestUser } from "../harness/fixtures";
import { getCookie, resetCookies, setCookie } from "../harness/cookies";

beforeEach(() => {
  resetCookies();
  resetRateLimits();
});

async function signInAs(user: {
  id: string;
  role: string;
  isActive?: boolean;
}): Promise<void> {
  await createSession({
    userId: user.id,
    role: user.role,
    ...(user.role === "ADMIN" && { adminVerified: true as const }),
  });
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

  it("rejects a signed token that has no server-side session", async () => {
    const user = await createTestUser({ role: "CANDIDATE" });

    // A signed token alone does not establish a server-side session.
    setCookie(SESSION_COOKIE_NAME, await encryptAdminToken(user.id));

    const current = await getCurrentUser();

    expect(current).toBeNull();
  });

  it("returns null for a deactivated account even with a valid session", async () => {
    const user = await createTestUser({ role: "CANDIDATE", isActive: false });
    await signInAs(user);

    expect(await getCurrentUser()).toBeNull();
  });

  it("returns null for a session that points at a missing user", async () => {
    setCookie(SESSION_COOKIE_NAME, await encryptAdminToken("ghost-user"));

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
  it("replaces the first browser's session when a second browser signs in", async () => {
    const user = await createTestUser({ role: "CANDIDATE" });
    const payload = { userId: user.id, role: "CANDIDATE" as const };
    expect(await createSession(payload)).toBe("created");
    const firstCookie = getCookie(SESSION_COOKIE_NAME)!;

    resetCookies();
    expect(await createSession(payload)).toBe("created");
    const secondCookie = getCookie(SESSION_COOKIE_NAME)!;
    expect(secondCookie).not.toBe(firstCookie);
    expect(await prisma.userSession.count({ where: { userId: user.id } })).toBe(1);

    setCookie(SESSION_COOKIE_NAME, firstCookie);
    expect(await getSession()).toBeNull();
    const revoked = await checkBrowserSession();
    expect(revoked.status).toBe(401);
    expect(revoked.headers.get("Cache-Control")).toBe("private, no-store");
    await deleteSession();

    setCookie(SESSION_COOKIE_NAME, secondCookie);
    expect((await checkBrowserSession()).status).toBe(204);
    expect(await getSession()).toEqual(payload);
  });

  it.each([
    ["CANDIDATE", 30],
    ["RECRUITER", 15],
    ["ADMIN", 15],
  ] as const)(
    "expires an idle %s session after %i minutes",
    async (role, minutes) => {
      const user = await createTestUser({ role });
      await signInAs(user);
      await prisma.userSession.updateMany({
        where: { userId: user.id },
        data: { lastSeenAt: new Date(Date.now() - minutes * 60_000) },
      });
      expect(await getSession()).toBeNull();
    },
  );

  it("records activity without moving the absolute expiry", async () => {
    const user = await createTestUser();
    await signInAs(user);
    const where = { userId: user.id };
    const earlier = new Date(Date.now() - 10 * 60_000);
    await prisma.userSession.updateMany({
      where,
      data: { lastSeenAt: earlier },
    });
    const original = await prisma.userSession.findFirstOrThrow({ where });
    expect(await getSession({ touch: false })).not.toBeNull();
    const checked = await prisma.userSession.findFirstOrThrow({ where });
    expect(checked.lastSeenAt).toEqual(original.lastSeenAt);
    expect(await getSession()).not.toBeNull();
    const current = await prisma.userSession.findFirstOrThrow({ where });
    expect(current.lastSeenAt.getTime()).toBeGreaterThan(earlier.getTime());
    expect(current.expiresAt).toEqual(original.expiresAt);
    await prisma.userSession.updateMany({
      where,
      data: { expiresAt: new Date() },
    });
    expect(await getSession()).toBeNull();
  });

  it("rejects the old cookie after sign-out", async () => {
    const user = await createTestUser();
    await signInAs(user);
    const token = getCookie(SESSION_COOKIE_NAME)!;
    await deleteSession();
    setCookie(SESSION_COOKIE_NAME, token);
    expect(await getSession()).toBeNull();
  });

  it("round-trips createSession through getSession", async () => {
    const user = await createTestUser({ role: "CANDIDATE" });
    await signInAs(user);

    const session = await getSession();

    expect(session).toEqual({ userId: user.id, role: "CANDIDATE" });
    expect(await prisma.user.count({ where: { id: user.id } })).toBe(1);
  });
});
