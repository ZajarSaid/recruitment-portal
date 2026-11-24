import { beforeEach, expect, it, vi } from "vitest";

import { requestAdminCode, verifyAdminCode } from "@/lib/actions/admin-auth";
import { loginAction } from "@/lib/actions/auth";
import { ADMIN_CHALLENGE_COOKIE } from "@/lib/admin-challenge";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { sendAdminSignInCode } from "@/lib/email/admin-sign-in-email";
import { resetRateLimits } from "@/lib/rate-limit";
import { getSession } from "@/lib/session";
import { createTestUser, formData } from "../harness/fixtures";
import { getCookie, resetCookies, setCookie } from "../harness/cookies";
import { expectRedirect } from "../harness/redirect";

vi.mock("@/lib/email/admin-sign-in-email", () => ({
  sendAdminSignInCode: vi.fn(),
}));
const emailCode = vi.mocked(sendAdminSignInCode);

beforeEach(() => {
  resetCookies();
  resetRateLimits();
  emailCode.mockReset().mockResolvedValue({ delivered: true });
});

it("requires the emailed code, creates a verified session, and rejects replay", async () => {
  const admin = await createTestUser({ role: "ADMIN" });
  const credentials = formData({
    email: admin.email,
    password: admin.plainPassword,
  });
  expect(await loginAction(undefined, credentials)).toMatchObject({
    message: "Invalid email or password.",
  });
  expect(await getSession()).toBeNull();
  expect(await requestAdminCode(undefined, credentials)).toMatchObject({
    ok: true,
  });
  expect(await getSession()).toBeNull();
  expect(emailCode).toHaveBeenCalledExactlyOnceWith(
    admin.email,
    expect.stringMatching(/^\d{6}$/),
  );

  const challenge = getCookie(ADMIN_CHALLENGE_COOKIE)!;
  const [, code] = emailCode.mock.calls[0]!;
  const wrongCode = code === "000000" ? "111111" : "000000";
  expect(
    await verifyAdminCode(undefined, formData({ code: wrongCode })),
  ).toMatchObject({ message: expect.stringContaining("Invalid code") });
  expect(
    await expectRedirect(verifyAdminCode(undefined, formData({ code }))),
  ).toBe("/admin?verified=1");
  expect(await getCurrentUser()).toMatchObject({ id: admin.id, role: "ADMIN" });

  resetCookies();
  setCookie(ADMIN_CHALLENGE_COOKIE, challenge);
  expect(await verifyAdminCode(undefined, formData({ code }))).toMatchObject({
    message: expect.stringContaining("expired"),
  });
  expect(await getSession()).toBeNull();
});

it("locks a challenge after five incorrect codes", async () => {
  const admin = await createTestUser({ role: "ADMIN" });
  await requestAdminCode(
    undefined,
    formData({ email: admin.email, password: admin.plainPassword }),
  );
  const [, code] = emailCode.mock.calls[0]!;
  const wrongCode = code === "000000" ? "111111" : "000000";
  for (let attempt = 0; attempt < 5; attempt++) {
    await verifyAdminCode(undefined, formData({ code: wrongCode }));
  }
  expect(await verifyAdminCode(undefined, formData({ code }))).toMatchObject({
    message: expect.stringContaining("attempt limit"),
  });
  expect(await getSession()).toBeNull();
});

it("recovers when the first administrator credential lookup fails", async () => {
  const admin = await createTestUser({ role: "ADMIN" });
  const lookup = vi.spyOn(prisma.user, "findUnique")
    .mockRejectedValueOnce(Object.assign(new Error("Database unavailable"), { code: "P2039" }));
  try {
    const result = await requestAdminCode(undefined, formData({
      email: admin.email,
      password: admin.plainPassword,
    }));
    expect(result).toMatchObject({ ok: true });
    expect(lookup).toHaveBeenCalledTimes(2);
    expect(emailCode).toHaveBeenCalledOnce();
    expect(await getSession()).toBeNull();
  } finally {
    lookup.mockRestore();
  }
});

it("lets an administrator reuse the code when session creation fails", async () => {
  const admin = await createTestUser({ role: "ADMIN" });
  await requestAdminCode(
    undefined,
    formData({ email: admin.email, password: admin.plainPassword }),
  );
  const [, code] = emailCode.mock.calls[0]!;
  const transaction = vi.spyOn(prisma, "$transaction")
    .mockRejectedValueOnce(new Error("Database unavailable"));
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    expect(await verifyAdminCode(undefined, formData({ code }))).toMatchObject({
      message: expect.stringContaining("temporarily unavailable"),
    });
    expect(await getSession()).toBeNull();
    expect(await expectRedirect(verifyAdminCode(undefined, formData({ code })))).toBe("/admin?verified=1");
    expect(await getSession()).toMatchObject({ userId: admin.id, adminVerified: true });
  } finally {
    transaction.mockRestore();
    log.mockRestore();
  }
});

it("keeps the sign-in form available during database failures for every role", async () => {
  const lookup = vi.spyOn(prisma.user, "findUnique")
    .mockRejectedValue(Object.assign(new Error("Database unavailable"), { code: "P2039" }));
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    const credentials = formData({ email: "user@example.com", password: "Password123!" });
    const unavailable = { message: "Sign-in is temporarily unavailable. Please try again shortly." };
    expect(await loginAction(undefined, credentials)).toEqual(unavailable);
    expect(await requestAdminCode(undefined, credentials)).toEqual(unavailable);
    expect(lookup).toHaveBeenCalledTimes(4);
    expect(emailCode).not.toHaveBeenCalled();
    expect(await getSession()).toBeNull();
  } finally {
    lookup.mockRestore();
    log.mockRestore();
  }
});
