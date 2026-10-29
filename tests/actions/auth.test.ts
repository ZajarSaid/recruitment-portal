import { beforeEach, describe, expect, it } from "vitest";

import {
  loginAction,
  logoutAction,
  registerAction,
} from "@/lib/actions/auth";
import { prisma } from "@/lib/db";
import { resetRateLimits } from "@/lib/rate-limit";
import {
  decryptSession,
  SESSION_COOKIE_NAME,
} from "@/lib/session-core";
import { DEFAULT_TEST_PASSWORD, formData, uniqueEmail } from "../harness/fixtures";
import { getCookie, resetCookies } from "../harness/cookies";
import { expectRedirect } from "../harness/redirect";

describe("registration", () => {
  beforeEach(() => {
    resetCookies();
    resetRateLimits();
  });

  it("creates a CANDIDATE account, signs the user in, and redirects", async () => {
    const email = uniqueEmail("register");
    const data = formData({
      name: "Asha Moyo",
      email,
      password: DEFAULT_TEST_PASSWORD,
      confirmPassword: DEFAULT_TEST_PASSWORD,
    });

    const target = await expectRedirect(registerAction(undefined, data));

    expect(target).toBe("/dashboard");

    const user = await prisma.user.findUnique({ where: { email } });
    expect(user).not.toBeNull();
    expect(user?.role).toBe("CANDIDATE");
    expect(user?.isActive).toBe(true);
    expect(user?.passwordHash).not.toBe(DEFAULT_TEST_PASSWORD);

    const token = getCookie(SESSION_COOKIE_NAME);
    expect(token).toBeDefined();
    const session = await decryptSession(token);
    expect(session).toEqual({ userId: user?.id, role: "CANDIDATE" });
  });

  it("never lets a client-supplied role escalate privileges", async () => {
    const email = uniqueEmail("escalate");
    const data = formData({
      name: "Malicious Actor",
      email,
      password: DEFAULT_TEST_PASSWORD,
      confirmPassword: DEFAULT_TEST_PASSWORD,
      role: "ADMIN",
    });

    await expectRedirect(registerAction(undefined, data));

    const user = await prisma.user.findUnique({ where: { email } });
    expect(user?.role).toBe("CANDIDATE");
  });

  it("rejects a duplicate email address", async () => {
    const email = uniqueEmail("duplicate");
    await prisma.user.create({
      data: {
        name: "Existing User",
        email,
        passwordHash: "irrelevant",
        role: "CANDIDATE",
      },
    });

    const state = await registerAction(
      undefined,
      formData({
        name: "Twin Account",
        email,
        password: DEFAULT_TEST_PASSWORD,
        confirmPassword: DEFAULT_TEST_PASSWORD,
      }),
    );

    expect(state?.errors?.email).toContain(
      "An account with this email already exists.",
    );
    expect(getCookie(SESSION_COOKIE_NAME)).toBeUndefined();
  });

  it("rejects an invalid registration payload", async () => {
    const state = await registerAction(
      undefined,
      formData({
        name: "A",
        email: uniqueEmail("invalid"),
        password: "short",
        confirmPassword: "different",
      }),
    );

    expect(state?.errors).toBeDefined();
    expect(state?.errors?.password).toBeDefined();
    expect(state?.errors?.confirmPassword).toBeDefined();
  });
});

describe("login", () => {
  beforeEach(() => {
    resetCookies();
    resetRateLimits();
  });

  it("signs in a valid recruiter and redirects to their dashboard", async () => {
    const email = uniqueEmail("recruiter-login");
    const { hashPassword } = await import("@/lib/password");
    await prisma.user.create({
      data: {
        name: "Grace Mushi",
        email,
        passwordHash: await hashPassword(DEFAULT_TEST_PASSWORD),
        role: "RECRUITER",
      },
    });

    const target = await expectRedirect(
      loginAction(
        undefined,
        formData({ email, password: DEFAULT_TEST_PASSWORD }),
      ),
    );

    expect(target).toBe("/recruiter");

    const token = getCookie(SESSION_COOKIE_NAME);
    const session = await decryptSession(token);
    expect(session?.role).toBe("RECRUITER");
  });

  it("rejects an incorrect password", async () => {
    const email = uniqueEmail("wrong-pass");
    const { hashPassword } = await import("@/lib/password");
    await prisma.user.create({
      data: {
        name: "Real User",
        email,
        passwordHash: await hashPassword(DEFAULT_TEST_PASSWORD),
        role: "CANDIDATE",
      },
    });

    const state = await loginAction(
      undefined,
      formData({ email, password: "WrongPassword1" }),
    );

    expect(state?.message).toBe("Invalid email or password.");
    expect(getCookie(SESSION_COOKIE_NAME)).toBeUndefined();
  });

  it("rejects an unknown email address with the same generic error", async () => {
    const state = await loginAction(
      undefined,
      formData({ email: uniqueEmail("ghost"), password: "Whatever123" }),
    );

    expect(state?.message).toBe("Invalid email or password.");
  });

  it("rejects a deactivated account", async () => {
    const email = uniqueEmail("deactivated");
    const { hashPassword } = await import("@/lib/password");
    await prisma.user.create({
      data: {
        name: "Disabled User",
        email,
        passwordHash: await hashPassword(DEFAULT_TEST_PASSWORD),
        role: "CANDIDATE",
        isActive: false,
      },
    });

    const state = await loginAction(
      undefined,
      formData({ email, password: DEFAULT_TEST_PASSWORD }),
    );

    expect(state?.message).toBe("This account has been deactivated.");
    expect(getCookie(SESSION_COOKIE_NAME)).toBeUndefined();
  });

  it("only honours same-site relative redirect targets", async () => {
    const email = uniqueEmail("safe-next");
    const { hashPassword } = await import("@/lib/password");
    await prisma.user.create({
      data: {
        name: "Safe User",
        email,
        passwordHash: await hashPassword(DEFAULT_TEST_PASSWORD),
        role: "CANDIDATE",
      },
    });

    const openRedirect = await expectRedirect(
      loginAction(
        undefined,
        formData({ email, password: DEFAULT_TEST_PASSWORD, next: "//evil.example" }),
      ),
    );
    expect(openRedirect).toBe("/dashboard");

    resetCookies();

    const safeRedirect = await expectRedirect(
      loginAction(
        undefined,
        formData({ email, password: DEFAULT_TEST_PASSWORD, next: "/jobs" }),
      ),
    );
    expect(safeRedirect).toBe("/jobs");
  });
});

describe("logout", () => {
  beforeEach(() => {
    resetCookies();
    resetRateLimits();
  });

  it("clears the session cookie and redirects to login", async () => {
    const email = uniqueEmail("logout");
    const { hashPassword } = await import("@/lib/password");
    await prisma.user.create({
      data: {
        name: "Signing Out",
        email,
        passwordHash: await hashPassword(DEFAULT_TEST_PASSWORD),
        role: "CANDIDATE",
      },
    });

    await expectRedirect(
      loginAction(undefined, formData({ email, password: DEFAULT_TEST_PASSWORD })),
    );
    expect(getCookie(SESSION_COOKIE_NAME)).toBeDefined();

    const target = await expectRedirect(logoutAction());

    expect(target).toBe("/login");
    expect(getCookie(SESSION_COOKIE_NAME)).toBeUndefined();
  });
});
