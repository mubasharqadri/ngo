import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const API_PREFIXES_REQUIRING_AUTH = [
  "/api/accounting",
  "/api/administration",
  "/api/crm",
  "/api/dashboard",
  "/api/database",
  "/api/donations",
  "/api/hrm",
  "/api/reports",
  "/api/setup",
  "/api/missions",
  "/api/posts",
  "/api/media",
  "/api/vendors",
];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("sws_session")?.value;

  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon") || pathname.includes(".")) {
    return NextResponse.next();
  }

  // ---- auth + health endpoints always pass through ----
  if (
    pathname === "/api/login" ||
    pathname === "/api/logout" ||
    pathname === "/api/health" ||
    pathname.startsWith("/api/auth")
  ) {
    return NextResponse.next();
  }

  // ---- ERP login page ----
  if (pathname === "/login") {
    if (token) return NextResponse.redirect(new URL("/dashboard", req.url));
    return NextResponse.next();
  }

  // ---- portal pages (their own auth inside pages/APIs) ----
  if (pathname.startsWith("/donor") || pathname.startsWith("/volunteer")) {
    return NextResponse.next();
  }

  // ---- portal + public APIs ----
  if (pathname.startsWith("/api/portal") || pathname.startsWith("/api/public")) {
    return NextResponse.next();
  }
  // public mission read (shared ones)
  if (pathname.startsWith("/api/missions") && req.nextUrl.searchParams.get("public") === "1") {
    return NextResponse.next();
  }
  // mission endpoints that authenticate via the volunteer portal cookie inside the route
  if (/^\/api\/missions\/\d+\/join$/.test(pathname) || pathname === "/api/missions/types") {
    return NextResponse.next();
  }

  // ---- public website pages ----
  const publicPages = ["/", "/about", "/campaigns", "/contacts", "/stories", "/transparency", "/missions", "/join"];
  if (publicPages.includes(pathname) || pathname.startsWith("/campaigns/") || pathname.startsWith("/stories/") || pathname.startsWith("/missions/")) {
    return NextResponse.next();
  }

  // ---- ERP APIs ----
  if (API_PREFIXES_REQUIRING_AUTH.some((p) => pathname.startsWith(p))) {
    if (!token) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    return NextResponse.next();
  }

  // ---- ERP pages ----
  if (!token) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
