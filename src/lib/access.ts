import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { NextResponse } from "next/server";
import { and, eq, gt, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { accessAttempts, allowedIps } from "@/db/schema";

/**
 * Control de acceso por lista blanca de IPs almacenada en PostgreSQL.
 *
 * Reglas:
 * 1. Sin cabecera x-forwarded-for → ejecución local (dev/preview) → acceso.
 * 2. Tabla allowed_ips VACÍA → modo abierto de arranque (para que el
 *    administrador pueda entrar y autorizar la primera IP).
 * 3. Con al menos una entrada → solo las IPs autorizadas pasan.
 * 4. Cualquier error de base de datos → se deniega (fail closed).
 */

export async function getClientIp(): Promise<{ ip: string; present: boolean }> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for") ?? h.get("x-real-ip");
  if (!fwd) {
    // Red local: no hay proxy que haya inyectado la IP
    return { ip: "127.0.0.1", present: false };
  }
  const first = fwd.split(",")[0].trim().replace(/^::ffff:/i, "");
  return { ip: first, present: true };
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return null;
    const v = Number(p);
    if (v > 255) return null;
    n = n * 256 + v;
  }
  return n >>> 0;
}

/** Soporta IP exacta ("83.45.12.9") y rangos CIDR IPv4 ("83.45.12.0/24"). */
export function ipMatches(entry: string, ip: string): boolean {
  const e = entry.trim();
  const target = ip.trim();
  if (e === target) return true;
  if (e.includes("/")) {
    const [base, bitsRaw] = e.split("/");
    const bits = Number(bitsRaw);
    const b = ipv4ToInt(base);
    const t = ipv4ToInt(target);
    if (b === null || t === null || !Number.isInteger(bits)) return false;
    if (bits < 0 || bits > 32) return false;
    if (bits === 0) return true;
    const mask = bits === 32 ? 0xffffffff : ~(0xffffffff >>> bits);
    return (b & mask) === (t & mask);
  }
  return false;
}

/** Valida formato de una entrada de lista blanca. */
export function isValidIpEntry(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (v.includes("/")) {
    const [base] = v.split("/");
    return ipv4ToInt(base) !== null;
  }
  if (ipv4ToInt(v) !== null) return true;
  // IPv6 exacta (caracteres válidos, longitud razonable)
  return /^[0-9a-fA-F:]{2,45}$/.test(v) && v.includes(":");
}

/**
 * Detecta el error PostgreSQL "la tabla no existe todavía" (42P01),
 * recorriendo la cadena de causas (Drizzle envuelve el error del driver:
 * el código vive en error.cause, no en el error exterior).
 */
export function isMissingRelation(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 6 && current; depth++) {
    if (typeof current !== "object") break;
    const e = current as { code?: string; message?: string; cause?: unknown };
    if (e.code === "42P01") return true;
    if (e.message && /relation .* does not exist/i.test(e.message)) return true;
    current = e.cause;
  }
  return false;
}

export async function isAuthorizedIp(): Promise<boolean> {
  const { ip, present } = await getClientIp();
  if (!present) return true; // entorno local
  try {
    const rows = await db
      .select({ ip: allowedIps.ip })
      .from(allowedIps);
    if (rows.length === 0) return true; // modo abierto de arranque
    return rows.some((r) => ipMatches(r.ip, ip));
  } catch (error) {
    if (isMissingRelation(error)) {
      // Las tablas de seguridad aún no se crearon (falta `drizzle-kit push`
      // sobre la base remota): comportamiento bootstrap = modo abierto.
      console.error(
        "[security] Tabla allowed_ips ausente en la base de datos. Ejecuta `drizzle-kit push` para activar el bloqueo por IP.",
      );
      return true;
    }
    console.error("[security] Error consultando lista blanca:", error);
    return false; // ante errores reales de conexión, fail closed
  }
}

/**
 * Marca un acceso denegado (best-effort, nunca rompe la petición).
 * Antirrebote: una entrada por IP cada 5 min; poda de más de 7 días.
 */
export async function logAccessAttempt(): Promise<void> {
  try {
    const { ip, present } = await getClientIp();
    if (!present) return;
    const fresh = new Date(Date.now() - 5 * 60 * 1000);
    const [existing] = await db
      .select({ id: accessAttempts.id })
      .from(accessAttempts)
      .where(
        and(eq(accessAttempts.ip, ip), gt(accessAttempts.createdAt, fresh)),
      )
      .limit(1);
    if (!existing) {
      await db.insert(accessAttempts).values({ ip });
    }
    await db
      .delete(accessAttempts)
      .where(lt(accessAttempts.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)));
  } catch {
    // silencioso: el registro no debe interferir con la defensa
  }
  void sql;
}

/** Guarda para API routes: null si autorizado, 404 invisible si no. */
export async function apiIpGuard(): Promise<NextResponse | null> {
  const allowed = await isAuthorizedIp();
  if (allowed) return null;
  await logAccessAttempt();
  return new NextResponse(null, {
    status: 404,
    headers: { "X-Content-Type-Options": "nosniff" },
  });
}

/**
 * Guarda para PÁGINAS: debe llamarse al inicio de cada Server Component
 * de página. Si la IP no está autorizada, sustituye el árbol por el 404
 * neutro — el contenido jamás llega al payload de datos del navegador.
 */
export async function requireAuthorizedIp(): Promise<void> {
  const allowed = await isAuthorizedIp();
  if (!allowed) notFound();
}

/**
 * Metadata condicional: los títulos reales solo se generan para IPs
 * autorizadas. Para el resto, la pestaña del navegador dice "404"
 * (con `absolute` para que no se le aplique el sufijo del template).
 * Uso: export async function generateMetadata() { return pageMetadata("Inventario"); }
 */
export async function pageMetadata(title: string): Promise<Metadata> {
  const allowed = await isAuthorizedIp();
  if (allowed) return { title };
  return { title: { absolute: "404" } };
}

/**
 * Lectura tolerante del estado de seguridad: si las tablas aún no existen
 * en la base remota, informa con `schemaReady: false` en lugar de romper
 * la página (el panel muestra las instrucciones para crearlas).
 */
export async function getSecuritySnapshot(): Promise<{
  rows: (typeof allowedIps.$inferSelect)[];
  attempts: (typeof accessAttempts.$inferSelect)[];
  schemaReady: boolean;
}> {
  const { asc, desc } = await import("drizzle-orm");
  try {
    const [rows, attempts] = await Promise.all([
      db.select().from(allowedIps).orderBy(asc(allowedIps.createdAt)),
      db
        .select()
        .from(accessAttempts)
        .orderBy(desc(accessAttempts.createdAt))
        .limit(12),
    ]);
    return { rows, attempts, schemaReady: true };
  } catch (error) {
    if (isMissingRelation(error)) {
      return { rows: [], attempts: [], schemaReady: false };
    }
    throw error;
  }
}
