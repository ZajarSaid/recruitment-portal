import { afterEach, describe, expect, it, vi } from "vitest";

import {
  decryptSession,
  encryptSession,
  SESSION_COOKIE_NAME,
} from "@/lib/session-core";

describe("session token", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("round-trips a session payload", async () => {
    const token = await encryptSession({ userId: "user-1", role: "RECRUITER" });
    const payload = await decryptSession(token);

    expect(payload).toEqual({ userId: "user-1", role: "RECRUITER" });
  });

  it("returns null when no token is supplied", async () => {
    expect(await decryptSession(undefined)).toBeNull();
  });

  it("returns null for a tampered token", async () => {
    const token = await encryptSession({ userId: "user-1", role: "ADMIN" });
    const tampered = token.slice(0, -2) + (token.endsWith("a") ? "bb" : "aa");

    expect(await decryptSession(tampered)).toBeNull();
  });

  it("returns null when the token was signed with a different secret", async () => {
    vi.stubEnv("SESSION_SECRET", "a-different-secret-value-0000000000000000");
    const token = await encryptSession({ userId: "user-1", role: "ADMIN" });

    vi.stubEnv("SESSION_SECRET", "the-original-secret-value-00000000000000");
    expect(await decryptSession(token)).toBeNull();
  });

  it("uses an http-only session cookie name", () => {
    expect(SESSION_COOKIE_NAME).toBe("session");
  });
});
