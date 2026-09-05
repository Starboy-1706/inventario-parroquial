import { NextRequest, NextResponse } from "next/server";
import {
  clearLoginFailures,
  checkLoginRateLimit,
  recordFailedLogin,
} from "@/lib/auth";
import {
  createSessionToken,
  getAuthConfig,
  safeEqualText,
  SESSION_COOKIE,
  SESSION_SECONDS,
} from "@/lib/auth-token";

export const dynamic = "force-dynamic";

function safeRedirect(value: unknown) {
  if (typeof value !== "string" || /[\\\u0000-\u001f]/.test(value)) return "/";
  try {
    const parsed = new URL(value, "https://local.invalid");
    if (
      parsed.origin === "https://local.invalid" &&
      parsed.pathname.startsWith("/") &&
      !parsed.pathname.startsWith("/acceso")
    ) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch {
    // destino inválido
  }
  return "/";
}

function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === request.nextUrl.host;
  } catch {
    return false;
  }
}

function noStore(data: Record<string, unknown>, status: number, extra?: HeadersInit) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store", ...extra },
  });
}

export async function POST(request: NextRequest) {
  const startedAt = Date.now();

  try {
    const config = getAuthConfig();
    if (!config.valid) {
      return noStore(
        {
          error:
            "El acceso aún no está configurado. El administrador debe añadir ACCESS_PASSWORD y SESSION_SECRET en Vercel.",
          code: "AUTH_NOT_CONFIGURED",
        },
        503,
      );
    }

    if (!isSameOrigin(request)) {
      return noStore({ error: "Solicitud no permitida." }, 403);
    }

    const limit = await checkLoginRateLimit();
    if (!limit.allowed) {
      return noStore(
        {
          error: `Demasiados intentos. Espera ${Math.ceil(limit.retryAfterSeconds / 60)} min antes de volver a intentarlo.`,
          code: "RATE_LIMITED",
          retryAfter: limit.retryAfterSeconds,
        },
        429,
        { "Retry-After": String(limit.retryAfterSeconds) },
      );
    }

    const body = (await request.json().catch(() => null)) as
      | { password?: unknown; next?: unknown }
      | null;
    if (!body || typeof body.password !== "string") {
      return noStore({ error: "Escribe la clave de acceso." }, 400);
    }
    if (body.password.length === 0) {
      return noStore({ error: "La clave no puede estar vacía." }, 400);
    }
    if (body.password.length > 256) {
      return noStore({ error: "La clave introducida no es válida." }, 400);
    }

    if (!safeEqualText(body.password, config.password)) {
      const remaining = await recordFailedLogin();
      const elapsed = Date.now() - startedAt;
      if (elapsed < 650) await new Promise((r) => setTimeout(r, 650 - elapsed));
      return noStore(
        {
          error:
            remaining > 0
              ? `Clave incorrecta. Quedan ${remaining} intento${remaining === 1 ? "" : "s"} antes del bloqueo temporal.`
              : "Acceso bloqueado durante 15 minutos por demasiados intentos.",
          code: "INVALID_PASSWORD",
          remaining,
        },
        remaining > 0 ? 401 : 429,
      );
    }

    await clearLoginFailures();
    const token = createSessionToken();
    const response = noStore({ ok: true, redirectTo: safeRedirect(body.next) }, 200);
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: SESSION_SECONDS,
      priority: "high",
    });
    return response;
  } catch (error) {
    console.error("[auth/login]", error);
    return noStore(
      {
        error:
          "No se pudo validar el acceso. Comprueba que la base de datos esté actualizada e inténtalo de nuevo.",
        code: "AUTH_SERVICE_ERROR",
      },
      503,
    );
  }
}
