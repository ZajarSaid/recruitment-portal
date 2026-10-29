import { SignJWT, jwtVerify } from "jose";

/**
 * Session token core (no `server-only` guard and no `next/headers` import) so
 * it can be shared by the server-side session helpers and by `proxy.ts`,
 * which runs outside the React Server Component environment.
 */

export const SESSION_COOKIE_NAME = "session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export type SessionPayload = {
  userId: string;
  role: string;
};

const ALGORITHM = "HS256";

function getEncodedKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.trim().length === 0) {
    throw new Error(
      "SESSION_SECRET is not set. Copy .env.example to .env and configure it.",
    );
  }
  return new TextEncoder().encode(secret);
}

export async function encryptSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ userId: payload.userId, role: payload.role })
    .setProtectedHeader({ alg: ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getEncodedKey());
}

export async function decryptSession(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getEncodedKey(), {
      algorithms: [ALGORITHM],
    });
    const userId = payload.userId;
    const role = payload.role;
    if (typeof userId !== "string" || typeof role !== "string") {
      return null;
    }
    return { userId, role };
  } catch {
    return null;
  }
}
