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

export async function getSession(): Promise<SessionPayload | null> {
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
  const active = await prisma.userSession.updateMany({
    where: { ...where, lastSeenAt: { ...where.lastSeenAt, lt: now } },
    data: { lastSeenAt: now },
  });
  if (active.count === 1) return payload;
  // Another request can already have recorded activity at this timestamp or later.
  const concurrent = await prisma.userSession.findFirst({
    where: { ...where, lastSeenAt: { gte: now } },
    select: { tokenHash: true },
  });
  return concurrent ? payload : null;
}

export async function createSession(
  payload: SessionPayload,
  claim?: (tx: Prisma.TransactionClient) => Promise<boolean>,
): Promise<boolean> {
  const now = new Date();
  const { idleSeconds, maxAgeSeconds } = getSessionPolicy(payload.role);
  const expiresAt = new Date(now.getTime() + maxAgeSeconds * 1000);
  const token = await encryptSession(payload);
  const cookieStore = await cookies();
  const previous = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const sessionWrites = (db: Prisma.TransactionClient) => [
    db.userSession.deleteMany({
      where: {
        OR: [
          {
            userId: payload.userId,
            OR: [
              { expiresAt: { lte: now } },
              {
                lastSeenAt: {
                  lte: new Date(now.getTime() - idleSeconds * 1000),
                },
              },
            ],
          },
          ...(previous ? [{ tokenHash: tokenHash(previous) }] : []),
        ],
      },
    }),
    db.userSession.create({
      data: {
        tokenHash: tokenHash(token),
        userId: payload.userId,
        lastSeenAt: now,
        expiresAt,
      },
    }),
  ] as const;

  if (claim) {
    const created = await prisma.$transaction(async (tx) => {
      if (!(await claim(tx))) return false;
      const [deleteExpired, insert] = sessionWrites(tx);
      await deleteExpired;
      await insert;
      return true;
    });
    if (!created) return false;
  } else {
    await prisma.$transaction([...sessionWrites(prisma)]);
  }
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.cookieSecure,
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });
  return true;
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
