import { afterEach, describe, expect, it, vi } from "vitest";

import { rateLimit, resetRateLimits } from "@/lib/rate-limit";

describe("rateLimit", () => {
  afterEach(() => {
    resetRateLimits();
    vi.useRealTimers();
  });

  it("allows requests up to the limit and blocks the next one", () => {
    const key = `test:${Math.random()}`;
    const limit = 3;

    expect(rateLimit(key, limit, 60_000).ok).toBe(true);
    expect(rateLimit(key, limit, 60_000).ok).toBe(true);
    expect(rateLimit(key, limit, 60_000).ok).toBe(true);
    expect(rateLimit(key, limit, 60_000).ok).toBe(false);
  });

  it("resets after the time window elapses", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));

    const key = `window:${Math.random()}`;
    expect(rateLimit(key, 1, 1_000).ok).toBe(true);
    expect(rateLimit(key, 1, 1_000).ok).toBe(false);

    vi.advanceTimersByTime(1_001);
    expect(rateLimit(key, 1, 1_000).ok).toBe(true);
  });

  it("tracks separate keys independently", () => {
    expect(rateLimit("key-a", 1, 60_000).ok).toBe(true);
    expect(rateLimit("key-b", 1, 60_000).ok).toBe(true);
    expect(rateLimit("key-a", 1, 60_000).ok).toBe(false);
  });
});
