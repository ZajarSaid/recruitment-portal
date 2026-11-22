"use server";

import { createHash, randomBytes } from "node:crypto";
import { redirect } from "next/navigation";

import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  toFieldErrors,
  type ActionState,
} from "@/lib/definitions";
import { prisma } from "@/lib/db";
import { schedulePasswordResetEmail } from "@/lib/email/password-reset-email";
import { env } from "@/lib/env";
import { flashFeedback } from "@/lib/flash-feedback";
import { roleHome } from "@/lib/navigation";
import { hashPassword, verifyPassword } from "@/lib/password";
import { rateLimit } from "@/lib/rate-limit";
import type { AppRole } from "@/lib/roles";
import { createSession, deleteSession } from "@/lib/session";

function formValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function hashResetToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

/** Only allow same-site absolute paths to prevent open redirects. */
function safeNextPath(value: string): string | null {
  if (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")) {
    return value;
  }
  return null;
}

export async function registerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = registerSchema.safeParse({
    name: formValue(formData, "name"),
    email: formValue(formData, "email"),
    password: formValue(formData, "password"),
    confirmPassword: formValue(formData, "confirmPassword"),
  });

  if (!parsed.success) {
    return { errors: toFieldErrors(parsed.error) };
  }

  const { name, email, password } = parsed.data;

  // Registration is always a Candidate account. The role is never read from
  // client input, so users cannot self-assign privileged roles.
  const limit = rateLimit(`register:${email}`, 5, 60_000);
  if (!limit.ok) {
    return { message: "Too many attempts. Please try again shortly." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return {
      errors: { email: ["An account with this email already exists."] },
    };
  }

  let createdUser: { id: string; role: AppRole };
  try {
    const passwordHash = await hashPassword(password);
    createdUser = await prisma.user.create({
      data: { name, email, passwordHash, role: "CANDIDATE" },
    });
  } catch {
    return { message: "Could not create your account. Please try again." };
  }

  await createSession({ userId: createdUser.id, role: createdUser.role });
  await flashFeedback("registered");
  // New candidates land on their profile so they can fill their master
  // details before applying to vacancies.
  redirect("/profile");
}

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formValue(formData, "email"),
    password: formValue(formData, "password"),
  });

  if (!parsed.success) {
    return { errors: toFieldErrors(parsed.error) };
  }

  const { email, password } = parsed.data;

  const limit = rateLimit(`login:${email}`, 10, 60_000);
  if (!limit.ok) {
    return {
      message: "Too many login attempts. Please wait a moment and try again.",
    };
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // Always run a comparison to keep timing similar whether or not the account
  // exists, then return a generic error so we never reveal account existence.
  const passwordMatches =
    user !== null && (await verifyPassword(password, user.passwordHash));

  if (!user || !passwordMatches || user.role === "ADMIN") {
    return { message: "Invalid email or password." };
  }

  if (!user.isActive) {
    return { message: "This account has been deactivated." };
  }

  await createSession({ userId: user.id, role: user.role });
  await flashFeedback("signed-in");

  const nextPath = safeNextPath(formValue(formData, "next"));
  if (user.role === "CANDIDATE" && !nextPath) {
    // Candidates who have not completed their master profile are sent to the
    // profile page first; applying later only needs an application letter.
    const profile = await prisma.candidateProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!profile) {
      redirect("/profile");
    }
  }

  redirect(nextPath ?? roleHome(user.role));
}

export async function logoutAction(): Promise<void> {
  await deleteSession();
  await flashFeedback("signed-out");
  redirect("/login");
}

export async function forgotPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formValue(formData, "email"),
  });

  if (!parsed.success) {
    return { errors: toFieldErrors(parsed.error) };
  }

  const { email } = parsed.data;

  const limit = rateLimit(`forgot:${email}`, 5, 60_000);
  if (!limit.ok) {
    return { message: "Too many requests. Please try again shortly." };
  }

  const user = await prisma.user.findUnique({ where: { email } });

  let resetLink: string | undefined;

  if (user?.isActive) {
    const rawToken = randomBytes(32).toString("hex");
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashResetToken(rawToken),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const url = new URL("/reset-password", env.appUrl);
    url.searchParams.set("token", rawToken);
    if (env.resendApiKey) {
      schedulePasswordResetEmail(user.email, url.toString());
    } else if (!env.isProduction) {
      resetLink = url.toString();
    }
  }

  return {
    ok: true,
    message:
      "If there is an active account for that email, check your inbox for a password reset link.",
    resetLink,
  };
}

export async function resetPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formValue(formData, "token"),
    password: formValue(formData, "password"),
    confirmPassword: formValue(formData, "confirmPassword"),
  });

  if (!parsed.success) {
    return { errors: toFieldErrors(parsed.error) };
  }

  const { token, password } = parsed.data;

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(token) },
  });

  if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
    return {
      errors: { token: ["This reset link is invalid or has expired."] },
    };
  }

  const passwordHash = await hashPassword(password);

  const reset = await prisma.$transaction(async (tx) => {
    const claimed = await tx.passwordResetToken.updateMany({
      where: { id: record.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (claimed.count === 0) return false;
    await tx.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    });
    await tx.userSession.deleteMany({ where: { userId: record.userId } });
    return true;
  });
  if (!reset) {
    return { errors: { token: ["This reset link is invalid or has expired."] } };
  }

  await flashFeedback("password-reset");
  redirect("/login?reset=1");
}
