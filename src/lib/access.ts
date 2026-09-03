import { headers, cookies } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { NextResponse } from "next/server";
import { and, eq, gt, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { accessAttempts, allowedIps } from "@/db/schema";

/** Clave maestra por defecto (se puede sobreescribir con variable ADMIN_KEY en Vercel) */
export const MASTER_KEY = process.env.ADMIN_KEY || "parroquia2026";
export const AUTH_COOKIE_NAME = "parish_secure_auth";

/* -------------------------------------------------------------------------- */
/* Detección y normalización de IP                                            */
/* -------------------------------------------------------------------------- */

export async function getClientIp(): Promise<{ ip: string; present: boolean }> {
  const h = await headers();
  // Prioridad de cabeceras en Vercel, Cloudflare y proxies estándar
  const raw =
    h.get("x-vercel-forwarded-for") ??
    h.get("x-real-ip") ??
    h.get("cf-connecting-ip") ??
    h.get("x-forwarded-for") ??
    h.get("x-client-ip");

  if (!raw) {
    return { ip: "127.0.0.1", present: false };
  }

  // Si viene una lista (ej. "client, proxy1, proxy2"), tomar la primera
  let first = raw.split(",")[0].trim();

  // Limpiar puertos IPv4 tipo "192.0.2.1:54321"
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d+$/.test(first)) {
    first = first.split(":")[0];
  }

  // Limpiar IPv4 mapeadas en IPv6 tipo "::ffff:192.0.2.1"
  first = first.replace(/^::ffff:/i, "");

  return { ip: first, present: true };
}

/* -------------------------------------------------------------------------- */
/* Motor de coincidencia IPv4 e IPv6 con CIDR                                */
/* -------------------------------------------------------------------------- */

function ipv4ToNumber(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return null;
    const v = Number(p);
    if (v < 0 || v > 255) return null;
    n = (n << 8) + v;
  }
  return n >>> 0;
}

function expandIpv6(ip: string): bigint | null {
  try {
    let s = ip.trim().toLowerCase();
    if (!s.includes(":")) return null;

    // Manejar IPv4 embebida al final
    if (s.includes(".")) {
      const lastColon = s.lastIndexOf(":");
      const v4Part = s.slice(lastColon + 1);
      const v4Num = ipv4ToNumber(v4Part);
      if (v4Num === null) return null;
      const hex1 = ((v4Num >>> 16) & 0xffff).toString(16);
      const hex2 = (v4Num & 0xffff).toString(16);
      s = s.slice(0, lastColon + 1) + `${hex1}:${hex2}`;
    }

    const halves = s.split("::");
    if (halves.length > 2) return null;

    let parts: string[] = [];
    if (halves.length === 2) {
      const left = halves[0] ? halves[0].split(":") : [];
      const right = halves[1] ? halves[1].split(":") : [];
      const missing = 8 - (left.length + right.length);
      if (missing < 0) return null;
      parts = [...left, ...Array(missing).fill("0"), ...right];
    } else {
      parts = s.split(":");
    }

    if (parts.length !== 8) return null;

    let total = BigInt(0);
    for (const p of parts) {
      const v = BigInt(parseInt(p || "0", 16));
      if (v < BigInt(0) || v > BigInt(0xffff)) return null;
      total = (total << BigInt(16)) | v;
    }
    return total;
  } catch {
    return null;
  }
}

export function ipMatches(entry: string, candidate: string): boolean {
  const e = entry.trim();
  const c = candidate.trim();
  if (e === c) return true;

  // 1. IPv4 match (exacto o CIDR)
  const isV4 = !e.includes(":") && !c.includes(":");
  if (isV4) {
    const cNum = ipv4ToNumber(c);
    if (cNum === null) return false;

    if (e.includes("/")) {
      const [base, bitsStr] = e.split("/");
      const bNum = ipv4ToNumber(base);
      const bits = Number(bitsStr);
      if (bNum === null || !Number.isInteger(bits) || bits < 0 || bits > 32) return false;
      if (bits === 0) return true;
      const mask = bits === 32 ? 0xffffffff : (~(0xffffffff >>> bits)) >>> 0;
      return (bNum & mask) === (cNum & mask);
    }

    const bNum = ipv4ToNumber(e);
    return bNum !== null && bNum === cNum;
  }

  // 2. IPv6 match (exacto o CIDR /64, /48, /128, etc.)
  const cBig = expandIpv6(c);
  if (cBig === null) return false;

  if (e.includes("/")) {
    const [base, bitsStr] = e.split("/");
    const bBig = expandIpv6(base);
    const bits = Number(bitsStr);
    if (bBig === null || !Number.isInteger(bits) || bits < 0 || bits > 128) return false;
    if (bits === 0) return true;
    const shift = BigInt(128 - bits);
    return (bBig >> shift) === (cBig >> shift);
  }

  const bBig = expandIpv6(e);
  if (bBig === null) return false;

  // Si ambas son IPv6 exactas, coinciden si son iguales o si comparten el prefijo /64 (móvil/hogar)
  if (bBig === cBig) return true;
  return (bBig >> BigInt(64)) === (cBig >> BigInt(64));
}

export function isValidIpEntry(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (v.includes("/")) {
    const [base, bitsStr] = v.split("/");
    const bits = Number(bitsStr);
    if (!Number.isInteger(bits)) return false;
    if (base.includes(":")) {
      return bits >= 0 && bits <= 128 && expandIpv6(base) !== null;
    }
    return bits >= 0 && bits <= 32 && ipv4ToNumber(base) !== null;
  }
  return ipv4ToNumber(v) !== null || expandIpv6(v) !== null;
}

/* -------------------------------------------------------------------------- */
/* Comprobación de seguridad (Doble factor: Cookie de sesión + Lista IP)       */
/* -------------------------------------------------------------------------- */

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
  // 1. Si el dispositivo tiene la cookie de rescate/sesión autorizada, entra siempre
  try {
    const c = await cookies();
    const token = c.get(AUTH_COOKIE_NAME)?.value;
    if (token && token === MASTER_KEY) {
      return true;
    }
  } catch {
    // cookies no disponibles en algunos contextos
  }

  // 2. Comprobación de IP
  const { ip, present } = await getClientIp();
  if (!present) return true; // Entorno local sin proxy

  try {
    const rows = await db.select({ ip: allowedIps.ip }).from(allowedIps);
    if (rows.length === 0) return true; // Modo bootstrap (abierto hasta añadir la primera IP)
    return rows.some((r) => ipMatches(r.ip, ip));
  } catch (error) {
    if (isMissingRelation(error)) {
      console.error("[security] Tabla allowed_ips ausente; modo bootstrap abierto.");
      return true;
    }
    console.error("[security] Error consultando lista blanca:", error);
    return false;
  }
}

export async function logAccessAttempt(): Promise<void> {
  try {
    const { ip, present } = await getClientIp();
    if (!present) return;
    const fresh = new Date(Date.now() - 5 * 60 * 1000);
    const [existing] = await db
      .select({ id: accessAttempts.id })
      .from(accessAttempts)
      .where(and(eq(accessAttempts.ip, ip), gt(accessAttempts.createdAt, fresh)))
      .limit(1);

    if (!existing) {
      await db.insert(accessAttempts).values({ ip });
    }
    await db
      .delete(accessAttempts)
      .where(lt(accessAttempts.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)));
  } catch {
    // Silencioso
  }
  void sql;
}

export async function apiIpGuard(): Promise<NextResponse | null> {
  const allowed = await isAuthorizedIp();
  if (allowed) return null;
  await logAccessAttempt();
  return new NextResponse(null, {
    status: 404,
    headers: { "X-Content-Type-Options": "nosniff" },
  });
}

export async function requireAuthorizedIp(): Promise<void> {
  const allowed = await isAuthorizedIp();
  if (!allowed) notFound();
}

export async function pageMetadata(title: string): Promise<Metadata> {
  const allowed = await isAuthorizedIp();
  if (allowed) return { title };
  return { title: { absolute: "404" } };
}

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
        .limit(15),
    ]);
    return { rows, attempts, schemaReady: true };
  } catch (error) {
    if (isMissingRelation(error)) {
      return { rows: [], attempts: [], schemaReady: false };
    }
    throw error;
  }
}
