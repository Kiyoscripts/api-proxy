import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = new Set(["/", "/login", "/register", "/verify-email", "/forgot-password", "/reset-password", "/docs", "/model-square"]);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-current-path", pathname);
  const next = () => NextResponse.next({ request: { headers: requestHeaders } });
  if (pathname.startsWith("/api") || pathname.startsWith("/v1") || pathname.startsWith("/_next") || pathname === "/favicon.ico") return next();
  if (PUBLIC_PATHS.has(pathname)) return next();
  if (req.cookies.get("userId")?.value || req.headers.get("x-user-id")) return next();
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
