import "server-only";

const retryableReadCodes = new Set(["P1001", "P1002", "P1017", "P2024", "P2039"]);

function errorCode(error: unknown) {
  return error instanceof Error && "code" in error && typeof error.code === "string"
    ? error.code
    : undefined;
}

export async function readForSignIn<T>(read: () => PromiseLike<T>): Promise<T> {
  try {
    return await read();
  } catch (error) {
    if (!retryableReadCodes.has(errorCode(error) ?? "")) throw error;
    return await read();
  }
}

export async function handleSignInFailure<T>(operation: string, run: () => Promise<T>) {
  try {
    return await run();
  } catch (error) {
    console.error("[sign-in] Operation failed", {
      operation,
      code: errorCode(error),
      type: error instanceof Error ? error.name : "UnknownError",
    });
    return { message: "Sign-in is temporarily unavailable. Please try again shortly." };
  }
}
