/** Shared in-memory session cookie helpers (backed by `tests/setup.ts`). */

const globalWithCookies = globalThis as unknown as {
  __cookieStore?: Map<string, string>;
};

function store(): Map<string, string> {
  if (!globalWithCookies.__cookieStore) {
    globalWithCookies.__cookieStore = new Map<string, string>();
  }
  return globalWithCookies.__cookieStore;
}

export function resetCookies(): void {
  store().clear();
}

export function getCookie(name: string): string | undefined {
  return store().get(name);
}

export function setCookie(name: string, value: string): void {
  store().set(name, value);
}
