import { vi } from "vitest";

/**
 * Shared test environment mocks.
 *
 * Server Actions and the data-access layer depend on Next.js request-scoped
 * APIs. In tests we replace them with deterministic, in-memory equivalents:
 *
 * - `next/headers`    -> a shared cookie jar (so session round-trips work)
 * - `next/navigation` -> `redirect` throws, like the real implementation
 * - `next/cache`      -> revalidation is a no-op
 */

type Cookie = { name: string; value: string };

const globalWithCookies = globalThis as unknown as {
  __cookieStore?: Map<string, string>;
};
globalWithCookies.__cookieStore = new Map<string, string>();

vi.mock("next/headers", () => ({
  cookies: async () => {
    const store = globalWithCookies.__cookieStore as Map<string, string>;
    return {
      get(name: string): Cookie | undefined {
        const value = store.get(name);
        return value === undefined ? undefined : { name, value };
      },
      set(name: string, value: string): void {
        store.set(name, value);
      },
      delete(name: string): void {
        store.delete(name);
      },
    };
  },
  headers: async () => new Headers({ host: "localhost:3000" }),
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${String(url)}`);
  },
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  forbidden: () => {
    throw new Error("NEXT_FORBIDDEN");
  },
  unauthorized: () => {
    throw new Error("NEXT_UNAUTHORIZED");
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: () => {},
  revalidateTag: () => {},
}));

/**
 * Email dispatch is scheduled inside Next's request-scoped `after`, which
 * cannot run outside a real request. Tests replace the schedulers with
 * no-ops; the underlying send helpers are exercised separately.
 */
vi.mock("@/lib/email/application-emails", () => ({
  scheduleApplicationSubmittedEmails: () => {},
  scheduleApplicationShortlistedEmail: () => {},
}));

/**
 * Storage abstraction: force the local fallback so integration tests never
 * perform real Cloudinary network uploads. The module reads its credentials
 * at import time, so they must be removed before any test module loads it.
 */
for (const name of [
  "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME",
  "NEXT_PUBLIC_CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
]) {
  delete process.env[name];
}
