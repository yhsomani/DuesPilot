import { NextResponse, type NextRequest } from "next/server";

const AUTH_COOKIE_NAME =
  process.env.NODE_ENV === "production"
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public routes
  if (
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/register") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Protect dashboard routes
  if (pathname.startsWith("/dashboard")) {
    const hasSession = req.cookies.has(AUTH_COOKIE_NAME);
    if (!hasSession) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
