import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE_NAME, decryptSession } from "@/lib/session-core";
import { ADMIN_SIGN_IN_PATH, isAdminHost } from "@/lib/admin-access";

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

  if (pathname === ADMIN_SIGN_IN_PATH || pathname.startsWith(`${ADMIN_SIGN_IN_PATH}/`)) {
    if (!isAdminHost(request.headers.get("host"))) {
      return new NextResponse("Not found", { status: 404 });
    }
    if (pathname !== ADMIN_SIGN_IN_PATH && (session?.role !== "ADMIN" || !session.adminVerified)) {
      return NextResponse.redirect(new URL(ADMIN_SIGN_IN_PATH, request.url));
    }
    return NextResponse.next();
  }

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/profile/:path*",
    "/recruiter/:path*",
    "/admin/:path*",
  ],
};
