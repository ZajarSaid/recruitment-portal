import "server-only";

import { cookies } from "next/headers";

import { env } from "./env";
import { isAppRole } from "./roles";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  decryptSession,
  encryptSession,
  type SessionPayload,
} from "./session-core";

export type { SessionPayload } from "./session-core";

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const payload = await decryptSession(token);
  if (!payload || !isAppRole(payload.role)) {
    return null;
  }
  return payload;
}

export async function createSession(payload: SessionPayload): Promise<void> {
  const expiresAt = new Date(
    Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  );
  const token = await encryptSession(payload);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.cookieSecure,
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
