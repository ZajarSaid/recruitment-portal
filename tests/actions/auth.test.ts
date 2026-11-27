import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  activateCandidateAction,
  loginAction,
  logoutAction,
  registerAction,
  forgotPasswordAction,
} from "@/lib/actions/auth";
import { prisma } from "@/lib/db";
import { sendCandidateActivationEmail } from "@/lib/email/candidate-activation-email";
import { schedulePasswordResetEmail } from "@/lib/email/password-reset-email";
import { resetRateLimits } from "@/lib/rate-limit";
import {
  decryptSession,
  SESSION_COOKIE_NAME,
} from "@/lib/session-core";
import { createTestUser, DEFAULT_TEST_PASSWORD, formData, uniqueEmail } from "../harness/fixtures";
import { getCookie, resetCookies } from "../harness/cookies";
import { expectRedirect } from "../harness/redirect";

vi.mock("@/lib/email/password-reset-email", () => ({
  schedulePasswordResetEmail: vi.fn(),
}));

vi.mock("@/lib/email/candidate-activation-email", () => ({
  sendCandidateActivationEmail: vi.fn(),
}));

describe("password reset email", () => {
  it("queues a reset email for an active account without exposing the link in the response", async () => {
    const user = await createTestUser();
    vi.stubEnv("RESEND_API_KEY", "test-key");

    try {
      const state = await forgotPasswordAction(undefined, formData({ email: user.email }));
      const unknown = await forgotPasswordAction(undefined, formData({ email: uniqueEmail() }));
      expect(state).toEqual(unknown);
      expect(state?.ok).toBe(true);
      expect(state?.resetLink).toBeUndefined();
      expect(schedulePasswordResetEmail).toHaveBeenCalledExactlyOnceWith(
        user.email,
        expect.stringMatching(/^http:\/\/localhost:3000\/reset-password\?token=[0-9a-f]{64}$/),
      );
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe("registration", () => {
  beforeEach(() => {
    resetCookies();
    resetRateLimits();
    vi.mocked(sendCandidateActivationEmail).mockReset().mockResolvedValue({ delivered: true });
  });

  it("emails a one-time activation link and requires confirmation before login", async () => {
    const email = uniqueEmail("register");
    const data = formData({
      name: "Asha Moyo",
      email,
      password: DEFAULT_TEST_PASSWORD,
      confirmPassword: DEFAULT_TEST_PASSWORD,
    });

    const target = await expectRedirect(registerAction(undefined, data));

    expect(target).toBe("/login?activation=sent");

    const user = await prisma.user.findUnique({ where: { email } });
    expect(user).not.toBeNull();
    expect(user?.role).toBe("CANDIDATE");
    expect(user?.isActive).toBe(true);
    expect(user?.passwordHash).not.toBe(DEFAULT_TEST_PASSWORD);

    expect(getCookie(SESSION_COOKIE_NAME)).toBeUndefined();
    expect(sendCandidateActivationEmail).toHaveBeenCalledExactlyOnceWith(
      email,
      expect.stringMatching(/^http:\/\/localhost:3000\/activate-account\?token=[0-9a-f]{64}$/),
    );
    const [, url] = vi.mocked(sendCandidateActivationEmail).mock.calls[0];
    const token = new URL(url).searchParams.get("token")!;
    expect(user?.activationTokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(user?.activationTokenHash).not.toBe(token);

    const credentials = formData({ email, password: DEFAULT_TEST_PASSWORD });
    expect((await loginAction(undefined, credentials))?.message).toMatch(/activate your account/i);
    expect(getCookie(SESSION_COOKIE_NAME)).toBeUndefined();
    expect(await expectRedirect(activateCandidateAction(formData({ token })))).toBe("/login?activation=confirmed");
    expect(getCookie(SESSION_COOKIE_NAME)).toBeUndefined();
    expect(await expectRedirect(activateCandidateAction(formData({ token })))).toBe("/login?activation=invalid");
    expect(await expectRedirect(loginAction(undefined, credentials))).toBe("/profile");
    expect(await decryptSession(getCookie(SESSION_COOKIE_NAME))).toEqual({
      userId: user?.id, role: "CANDIDATE",
    });
  });

  it("replaces an expired link when the candidate requests another with valid credentials", async () => {
    const email = uniqueEmail("activation-resend");
    await expectRedirect(registerAction(undefined, formData({
      name: "Asha Moyo",
      email,
      password: DEFAULT_TEST_PASSWORD,
      confirmPassword: DEFAULT_TEST_PASSWORD,
    })));
    const [, originalUrl] = vi.mocked(sendCandidateActivationEmail).mock.calls[0];
    const originalToken = new URL(originalUrl).searchParams.get("token")!;
    await prisma.user.update({
      where: { email },
      data: { activationExpiresAt: new Date(Date.now() - 1000) },
    });
    expect(await expectRedirect(activateCandidateAction(formData({ token: originalToken })))).toBe("/login?activation=invalid");

    const resend = formData({ email, password: DEFAULT_TEST_PASSWORD, intent: "resend-activation" });
    expect((await loginAction(undefined, resend))?.ok).toBe(true);
    const [, replacementUrl] = vi.mocked(sendCandidateActivationEmail).mock.calls[1];
    const token = new URL(replacementUrl).searchParams.get("token")!;
    expect(token).not.toBe(originalToken);
    expect((await loginAction(undefined, resend))?.ok).toBeUndefined();
    expect(sendCandidateActivationEmail).toHaveBeenCalledTimes(2);
    expect(await expectRedirect(activateCandidateAction(formData({ token })))).toBe("/login?activation=confirmed");
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

  it("sends candidates to their profile even when a redirect target is supplied", async () => {
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
    expect(openRedirect).toBe("/profile");

    const safeRedirect = await expectRedirect(
      loginAction(
        undefined,
        formData({ email, password: DEFAULT_TEST_PASSWORD, next: "/jobs" }),
      ),
    );
    expect(safeRedirect).toBe("/profile");
  });

  it("sends a candidate without a complete profile to the profile page", async () => {
    const email = uniqueEmail("no-profile");
    const { hashPassword } = await import("@/lib/password");
    await prisma.user.create({
      data: {
        name: "Fresh Candidate",
        email,
        passwordHash: await hashPassword(DEFAULT_TEST_PASSWORD),
        role: "CANDIDATE",
      },
    });

    const target = await expectRedirect(
      loginAction(undefined, formData({ email, password: DEFAULT_TEST_PASSWORD })),
    );
    expect(target).toBe("/profile");
  });

  it("sends a candidate with a complete profile to their profile page", async () => {
    const email = uniqueEmail("with-profile");
    const { hashPassword } = await import("@/lib/password");
    const user = await prisma.user.create({
      data: {
        name: "Complete Candidate",
        email,
        passwordHash: await hashPassword(DEFAULT_TEST_PASSWORD),
        role: "CANDIDATE",
      },
    });
    await prisma.candidateProfile.create({
      data: {
        userId: user.id,
        educationLevel: "BACHELOR",
        birthYear: 1995,
        birthMonth: 6,
        physicalAddress: "Plot 1, Test Street, Dodoma",
        computerLiteracy: "INTERMEDIATE",
        languages: "Kiswahili, English",
        category: "GENERAL",
      },
    });

    const target = await expectRedirect(
      loginAction(undefined, formData({ email, password: DEFAULT_TEST_PASSWORD })),
    );
    expect(target).toBe("/profile");
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
