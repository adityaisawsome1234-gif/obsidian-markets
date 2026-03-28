import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if user has "logged in" (cookie set after clicking Continue on login page)
  const isLoggedIn = request.cookies.get("obsidian_session")?.value;

  // Public routes that don't require auth
  const publicPaths = ["/login", "/register", "/api", "/onboarding", "/stocks", "/ref", "/research/public", "/terms", "/developers", "/landing"];
  const isPublic = publicPaths.some((p) => pathname.startsWith(p));

  // If not logged in and trying to access app routes, redirect to landing
  if (!isLoggedIn && !isPublic) {
    const landingUrl = new URL("/landing", request.url);
    return NextResponse.redirect(landingUrl);
  }

  // If logged in and on landing/login page, redirect to dashboard
  if (isLoggedIn && (pathname === "/login" || pathname === "/landing")) {
    const dashUrl = new URL("/", request.url);
    return NextResponse.redirect(dashUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
