import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { allowedIps } from "@/db/schema";
import { AUTH_COOKIE_NAME, MASTER_KEY, getClientIp } from "@/lib/access";

export const dynamic = "force-dynamic";

/**
 * Endpoint de rescate instantáneo:
 * Permite acceder a través de: /seguridad/acceso?clave=parroquia2026
 * 1. Autoriza la IP actual del dispositivo en la base de datos (si no está ya).
 * 2. Asigna la cookie segura de sesión `parish_secure_auth`.
 * 3. Redirige a /seguridad con mensaje de éxito.
 */
export async function GET(request: NextRequest) {
  const clave = request.nextUrl.searchParams.get("clave")?.trim();

  if (!clave || clave !== MASTER_KEY) {
    return new Response("Clave no válida.", { status: 401 });
  }

  const client = await getClientIp();

  // Si la IP no estaba autorizada, la agregamos a PostgreSQL
  if (client.present) {
    try {
      await db
        .insert(allowedIps)
        .values({
          ip: client.ip,
          label: "Autorizado mediante enlace de rescate",
        })
        .onConflictDoNothing();
    } catch {
      // Si la tabla no está creada, el token por cookie permitirá el paso
    }
  }

  const redirectUrl = new URL("/seguridad", request.url);
  redirectUrl.searchParams.set("rescate", "ok");

  const response = NextResponse.redirect(redirectUrl);

  // Cookie segura válida durante 60 días
  response.cookies.set(AUTH_COOKIE_NAME, MASTER_KEY, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 24 * 60 * 60, // 60 días
  });

  return response;
}
