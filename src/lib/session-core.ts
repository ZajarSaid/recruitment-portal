import { SignJWT, jwtVerify } from "jose";

/**
 * Session token core (no `server-only` guard and no `next/headers` import) so
 * it can be shared by the server-side session helpers and by `proxy.ts`,
 * which runs outside the React Server Component environment.
 */

export const SESSION_COOKIE_NAME = "session";
export function getSessionPolicy(role: string) {
  return role === "CANDIDATE"
    ? { idleSeconds: 30 * 60, maxAgeSeconds: 24 * 60 * 60 }
    : { idleSeconds: 15 * 60, maxAgeSeconds: 8 * 60 * 60 };
}

export type SessionPayload = {
  userId: string;
  role: string;
  adminVerified?: true;
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
  const issuedAt = Math.floor(Date.now() / 1000);
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALGORITHM })
    .setJti(crypto.randomUUID())
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + getSessionPolicy(payload.role).maxAgeSeconds)
    .sign(getEncodedKey());
}

export async function decryptSession(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getEncodedKey(), {
      algorithms: [ALGORITHM],
      requiredClaims: ["jti", "iat", "exp"],
    });
    const userId = payload.userId;
    const role = payload.role;
    if (typeof userId !== "string" || typeof role !== "string") {
      return null;
    }
    return payload.adminVerified === true
      ? { userId, role, adminVerified: true }
      : { userId, role };
  } catch {
    return null;
  }
}
