import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth-token";

const PUBLIC_PATHS = new Set([
  "/acceso",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/health",
]);

function safeNext(pathname: string, search: string) {
  const value = `${pathname}${search}`;
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

/** Puerta previa: evita renderizar la aplicación antes de iniciar sesión. */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.has(pathname);
  const validSession =
    verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value) !== null;

  if (pathname === "/acceso" && validSession) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  if (isPublic) return NextResponse.next();

  if (!validSession) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Autenticación requerida." },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    }
    const url = new URL("/acceso", request.url);
    url.searchParams.set("next", safeNext(pathname, search));
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
