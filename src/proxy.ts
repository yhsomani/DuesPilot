import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/middleware";

const STATIC_EXT =
  /\.(ico|png|jpg|jpeg|gif|svg|webp|css|woff2?|ttf|otf|eot|map|txt|xml|pdf)$/i;

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public routes and real static assets (explicit extensions only —
  // never a blanket "any path containing a dot" bypass).
  if (
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/register") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    STATIC_EXT.test(pathname)
  ) {
    return NextResponse.next();
  }

  // Protect dashboard routes — cookie-based session check.
  if (pathname.startsWith("/dashboard")) {
    const hasSession =
      req.cookies.has("authjs.session-token") ||
      req.cookies.has("__Secure-authjs.session-token") ||
      req.cookies.has("next-auth.session-token") ||
      req.cookies.has("__Secure-next-auth.session-token") ||
      req.cookies.has("sb-access-token");
    if (!hasSession) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Synchronize Supabase authentication cookies if configured
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    try {
      const { response } = createClient(req);
      return response;
    } catch {
      return NextResponse.next();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
