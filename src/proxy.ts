import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE_NAME, decryptSession } from "@/lib/session-core";

/**
 * Optimistic route protection only. It verifies that a signed session cookie
 * exists before allowing access to private areas. Role checks and record-level
 * authorization are always re-enforced on the server in pages, Server Actions,
 * and the data access layer.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await decryptSession(token);

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/recruiter/:path*", "/admin/:path*"],
};
