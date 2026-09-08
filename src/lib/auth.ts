import { createHmac } from "node:crypto";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ensureDbSchema } from "@/db/auto-migrate";
import { authLoginAttempts } from "@/db/schema";
import {
  getAuthConfig,
  SESSION_COOKIE,
  verifySessionToken,
} from "@/lib/auth-token";

const WINDOW_MS = 15 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;

export async function isAuthenticated(): Promise<boolean> {
  const jar = await cookies();
  return verifySessionToken(jar.get(SESSION_COOKIE)?.value) !== null;
}

/** Defensa final junto a los datos: no depende solamente de proxy.ts. */
export async function requireAuthenticated(): Promise<void> {
  if (!(await isAuthenticated())) notFound();
  // Auto-reparación del esquema en TODA ruta protegida: antes de consultar
  // la base, garantiza que existen todas las tablas y columnas nuevas.
  await ensureDbSchema();
}

/** Defensa para Route Handlers y mutaciones. */
export async function apiAuthGuard(): Promise<NextResponse | null> {
  if (await isAuthenticated()) return null;
  await ensureDbSchema();
  return NextResponse.json(
    { error: "Sesión no válida o caducada." },
    {
      status: 401,
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

export async function authPageMetadata(title: string): Promise<Metadata> {
  const allowed = await isAuthenticated();
  return allowed ? { title } : { title: { absolute: "Acceso restringido" } };
}

export async function getSessionInfo() {
  const jar = await cookies();
  const payload = verifySessionToken(jar.get(SESSION_COOKIE)?.value);
  return {
    authenticated: payload !== null,
    expiresAt: payload ? new Date(payload.exp * 1000) : null,
    configured: getAuthConfig().valid,
  };
}

async function requestFingerprint(): Promise<string> {
  const h = await headers();
  const origin =
    h.get("x-vercel-forwarded-for") ??
    h.get("cf-connecting-ip") ??
    h.get("x-real-ip") ??
    h.get("x-forwarded-for") ??
    "unknown";
  const ua = h.get("user-agent") ?? "unknown";
  const secret = getAuthConfig().secret || "unconfigured";
  return createHmac("sha256", secret)
    .update(`${origin.split(",")[0].trim()}|${ua.slice(0, 180)}`)
    .digest("hex");
}

export async function checkLoginRateLimit(): Promise<{
  allowed: boolean;
  retryAfterSeconds: number;
}> {
  const key = await requestFingerprint();
  const [row] = await db
    .select()
    .from(authLoginAttempts)
    .where(eq(authLoginAttempts.key, key));
  if (!row?.lockedUntil) return { allowed: true, retryAfterSeconds: 0 };

  const retry = Math.ceil((row.lockedUntil.getTime() - Date.now()) / 1000);
  if (retry <= 0) return { allowed: true, retryAfterSeconds: 0 };
  return { allowed: false, retryAfterSeconds: retry };
}

export async function recordFailedLogin(): Promise<number> {
  const key = await requestFingerprint();
  const now = new Date();

  return db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(authLoginAttempts)
      .where(eq(authLoginAttempts.key, key))
      .for("update");

    if (!current) {
      await tx.insert(authLoginAttempts).values({
        key,
        failures: 1,
        windowStartedAt: now,
        updatedAt: now,
      });
      return MAX_FAILURES - 1;
    }

    const windowExpired =
      now.getTime() - current.windowStartedAt.getTime() > WINDOW_MS;
    const failures = windowExpired ? 1 : current.failures + 1;
    const lockedUntil =
      failures >= MAX_FAILURES
        ? new Date(now.getTime() + LOCK_MS)
        : null;

    await tx
      .update(authLoginAttempts)
      .set({
        failures,
        windowStartedAt: windowExpired ? now : current.windowStartedAt,
        lockedUntil,
        updatedAt: now,
      })
      .where(eq(authLoginAttempts.key, key));

    return Math.max(0, MAX_FAILURES - failures);
  });
}

export async function clearLoginFailures(): Promise<void> {
  const key = await requestFingerprint();
  await db.delete(authLoginAttempts).where(eq(authLoginAttempts.key, key));
}
