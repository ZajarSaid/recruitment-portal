import "server-only";

import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import type { Prisma } from "@/generated/prisma/client";

import { prisma } from "./db";
import { env } from "./env";
import { isAppRole } from "./roles";
import {
  SESSION_COOKIE_NAME,
  getSessionPolicy,
  decryptSession,
  encryptSession,
  type SessionPayload,
} from "./session-core";

export type { SessionPayload } from "./session-core";

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function getSession({ touch = true } = {}): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const payload = await decryptSession(token);
  if (!token || !payload || !isAppRole(payload.role)) {
    return null;
  }
  const now = new Date();
  const { idleSeconds } = getSessionPolicy(payload.role);
  const where = {
    tokenHash: tokenHash(token),
    userId: payload.userId,
    expiresAt: { gt: now },
    lastSeenAt: { gt: new Date(now.getTime() - idleSeconds * 1000) },
    user: { isActive: true, role: payload.role },
  };
  if (touch) {
    const active = await prisma.userSession.updateMany({
      where: { ...where, lastSeenAt: { ...where.lastSeenAt, lt: now } },
      data: { lastSeenAt: now },
    });
    if (active.count === 1) return payload;
  }
  // Another request can already have recorded activity at this timestamp or later.
  const active = await prisma.userSession.findFirst({
    where: touch ? { ...where, lastSeenAt: { gte: now } } : where,
    select: { tokenHash: true },
  });
  return active ? payload : null;
}

export async function createSession(
  payload: SessionPayload,
  claim?: (tx: Prisma.TransactionClient) => Promise<boolean>,
): Promise<"created" | "rejected"> {
  const { maxAgeSeconds } = getSessionPolicy(payload.role);
  const token = await encryptSession(payload);
  const cookieStore = await cookies();
  const previous = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const previousHash = previous ? tokenHash(previous) : undefined;
  const result = await prisma.$transaction(async (tx) => {
    // Serialize sign-ins for this account so only the latest committed session survives.
    await tx.$queryRaw`SELECT id FROM User WHERE id = ${payload.userId} FOR UPDATE`;
    if (claim && !(await claim(tx))) return { status: "rejected" } as const;

    const now = new Date();
    await tx.userSession.deleteMany({
      where: {
        OR: [
          { userId: payload.userId },
          ...(previousHash ? [{ tokenHash: previousHash }] : []),
        ],
      },
    });
    const expiresAt = new Date(now.getTime() + maxAgeSeconds * 1000);
    await tx.userSession.create({
      data: {
        tokenHash: tokenHash(token),
        userId: payload.userId,
        lastSeenAt: now,
        expiresAt,
      },
    });
    return { status: "created", expiresAt } as const;
  });
  if (result.status !== "created") return result.status;
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.cookieSecure,
    expires: result.expiresAt,
    sameSite: "lax",
    path: "/",
  });
  return "created";
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (token)
    await prisma.userSession.deleteMany({
      where: { tokenHash: tokenHash(token) },
    });
  cookieStore.delete(SESSION_COOKIE_NAME);
}
