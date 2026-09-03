import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { allowedIps } from "@/db/schema";

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
    console.error("[security] Error consultando lista blanca:", error);
    return false; // fail closed
  }
}

/** Guarda para API routes: null si autorizado, 404 invisible si no. */
export async function apiIpGuard(): Promise<NextResponse | null> {
  const allowed = await isAuthorizedIp();
  if (allowed) return null;
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
