import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE, isAuthConfigured, verifySessionToken } from "@/lib/auth";

/**
 * Gate for the ELSA team area.
 *
 * In Next 16 this file replaces the old `middleware.ts` convention and runs on
 * the Node.js runtime. It executes before any /private route renders, so the
 * protected pages never even run their database queries for a logged-out
 * visitor.
 *
 * Only /private/* is gated. The membership form at /signup has to stay open to
 * the public, so it is deliberately not matched.
 */
export function proxy(request: NextRequest) {
  // Fail closed: with no password or signing secret configured, nobody gets in.
  if (!isAuthConfigured()) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "?error=unconfigured";
    return NextResponse.redirect(url);
  }

  const session = verifySessionToken(
    request.cookies.get(SESSION_COOKIE)?.value,
  );

  if (!session) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    // Send them back where they were headed once they have logged in.
    url.search = `?next=${encodeURIComponent(request.nextUrl.pathname)}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/private/:path*"],
};
