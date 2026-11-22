"use server";

import { createHmac, randomBytes, randomInt } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { ADMIN_SIGN_IN_PATH, isAdminHost } from "@/lib/admin-access";
import { ADMIN_CHALLENGE_COOKIE } from "@/lib/admin-challenge";
import { prisma } from "@/lib/db";
import {
  loginSchema,
  toFieldErrors,
  type ActionState,
} from "@/lib/definitions";
import { sendAdminSignInCode } from "@/lib/email/admin-sign-in-email";
import { env } from "@/lib/env";
import { flashFeedback } from "@/lib/flash-feedback";
import { verifyPassword } from "@/lib/password";
import { rateLimit } from "@/lib/rate-limit";
import { createSession } from "@/lib/session";

const CODE_LIFETIME_MS = 10 * 60_000;
const MAX_CODE_ATTEMPTS = 5;

function codeHash(id: string, code: string) {
  return createHmac("sha256", env.sessionSecret)
    .update(`admin-otp:${id}:${code}`)
    .digest("hex");
}

async function clearChallengeCookie() {
  const jar = await cookies();
  jar.set(ADMIN_CHALLENGE_COOKIE, "", {
    path: ADMIN_SIGN_IN_PATH,
    expires: new Date(0),
    httpOnly: true,
    sameSite: "strict",
    secure: env.cookieSecure,
  });
}

export async function requestAdminCode(
  _previous: ActionState,
  data: FormData,
): Promise<ActionState> {
  if (!isAdminHost((await headers()).get("host")))
    return { message: "Sign-in is unavailable." };

  const parsed = loginSchema.safeParse({
    email: data.get("email") ?? "",
    password: data.get("password") ?? "",
  });
  if (!parsed.success) return { errors: toFieldErrors(parsed.error) };
  const { email, password } = parsed.data;
  if (!rateLimit(`admin-sign-in:${email}`, 5, CODE_LIFETIME_MS).ok) {
    return {
      message: "Too many attempts. Wait a few minutes before trying again.",
    };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (
    !user ||
    !(await verifyPassword(password, user.passwordHash)) ||
    user.role !== "ADMIN" ||
    !user.isActive
  ) {
    return { message: "Invalid email or password." };
  }

  const id = randomBytes(32).toString("hex");
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const expiresAt = new Date(Date.now() + CODE_LIFETIME_MS);
  const challenge = {
    id,
    expiresAt,
    codeHash: codeHash(id, code),
    attempts: 0,
    accountVersion: user.updatedAt,
  };
  await prisma.adminSignInChallenge.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...challenge },
    update: challenge,
  });

  if (!(await sendAdminSignInCode(user.email, code)).delivered) {
    await prisma.adminSignInChallenge.deleteMany({ where: { id } });
    return { message: "We could not send a sign-in code. Try again shortly." };
  }

  const jar = await cookies();
  jar.set(ADMIN_CHALLENGE_COOKIE, id, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: "strict",
    path: ADMIN_SIGN_IN_PATH,
    expires: expiresAt,
  });
  return { ok: true, message: "Check your email for the sign-in code." };
}

export async function verifyAdminCode(
  _previous: ActionState,
  data: FormData,
): Promise<ActionState> {
  if (!isAdminHost((await headers()).get("host")))
    return { message: "Sign-in is unavailable." };

  const code = data.get("code");
  if (typeof code !== "string" || !/^\d{6}$/.test(code)) {
    return { errors: { code: ["Enter the six-digit code from your email."] } };
  }

  const id = (await cookies()).get(ADMIN_CHALLENGE_COOKIE)?.value;
  const challenge = id
    ? await prisma.adminSignInChallenge.findUnique({ where: { id } })
    : null;
  if (
    !challenge ||
    challenge.expiresAt <= new Date() ||
    challenge.attempts >= MAX_CODE_ATTEMPTS
  ) {
    return {
      message:
        "This code has expired or reached its attempt limit. Request a new one.",
    };
  }
  const validChallenge = {
    id: challenge.id,
    expiresAt: { gt: new Date() },
    attempts: { lt: MAX_CODE_ATTEMPTS },
    user: {
      role: "ADMIN" as const,
      isActive: true,
      updatedAt: challenge.accountVersion,
    },
  };
  const claimed = await prisma.adminSignInChallenge.deleteMany({
    where: { ...validChallenge, codeHash: codeHash(challenge.id, code) },
  });
  if (claimed.count !== 1) {
    await prisma.adminSignInChallenge.updateMany({
      where: validChallenge,
      data: { attempts: { increment: 1 } },
    });
    return {
      message: "Invalid code. Request a new code if this one has expired.",
    };
  }

  await clearChallengeCookie();
  await createSession({
    userId: challenge.userId,
    role: "ADMIN",
    adminVerified: true,
  });
  await flashFeedback("signed-in");
  redirect(`${ADMIN_SIGN_IN_PATH}?verified=1`);
}

export async function restartAdminSignIn(
  _previous: ActionState,
  _data: FormData,
): Promise<ActionState> {
  if (!isAdminHost((await headers()).get("host")))
    return { message: "Sign-in is unavailable." };
  const id = (await cookies()).get(ADMIN_CHALLENGE_COOKIE)?.value;
  if (id) await prisma.adminSignInChallenge.deleteMany({ where: { id } });
  await clearChallengeCookie();
  return { ok: true, message: "Enter your password to request a new code." };
}
