import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Optimistic cookie guard for the authed surfaces (Next 16 "proxy" convention,
// formerly middleware). The pages/routes still do a full server-side session
// check; this just keeps logged-out users out early.
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow the login page itself through.
  if (pathname === "/pos/login") return NextResponse.next();

  const hasSession = getSessionCookie(req);
  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/pos/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/pos/:path*", "/owner/:path*"],
};
