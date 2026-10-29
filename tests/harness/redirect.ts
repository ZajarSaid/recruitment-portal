/**
 * Executes a Server Action that is expected to redirect and returns the
 * redirect target. `next/navigation`'s `redirect` throws in tests
 * (see `tests/setup.ts`), matching production behaviour.
 */
export async function expectRedirect(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.startsWith("NEXT_REDIRECT:")) {
      return message.slice("NEXT_REDIRECT:".length);
    }
    throw error;
  }
  throw new Error("Expected the action to redirect, but it returned normally.");
}

/** Returns true when the thrown error is a Next.js redirect sentinel. */
export function isRedirectError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.startsWith("NEXT_REDIRECT:");
}
