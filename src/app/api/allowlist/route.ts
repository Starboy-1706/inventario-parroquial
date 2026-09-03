import { NextRequest, NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { allowedIps } from "@/db/schema";
import { apiIpGuard, getClientIp, isMissingRelation, isValidIpEntry } from "@/lib/access";

export const dynamic = "force-dynamic";

const SCHEMA_HINT =
  "La tabla de la lista blanca no existe en la base de datos. Ejecuta `npx drizzle-kit push` con tu DATABASE_URL y recarga.";

export async function GET() {
  const denied = await apiIpGuard();
  if (denied) return denied;
  try {
    const [rows, client] = await Promise.all([
      db.select().from(allowedIps).orderBy(asc(allowedIps.createdAt)),
      getClientIp(),
    ]);
    return NextResponse.json({ rows, clientIp: client.ip, enforce: rows.length > 0 });
  } catch (error) {
    if (isMissingRelation(error)) {
      return NextResponse.json({ error: SCHEMA_HINT, schemaReady: false }, { status: 503 });
    }
    throw error;
  }
}

export async function POST(request: NextRequest) {
  const denied = await apiIpGuard();
  if (denied) return denied;

  const body = await request.json().catch(() => ({}));
  const label = String(body.label ?? "").trim() || null;

  // Si no se indica IP, se autoriza la IP del propio dispositivo
  let ip = typeof body.ip === "string" ? body.ip.trim() : "";
  if (!ip) {
    const client = await getClientIp();
    ip = client.ip;
  }

  if (!isValidIpEntry(ip)) {
    return NextResponse.json(
      { error: "IP no válida. Usa formato 83.45.12.9 o rango 83.45.12.0/24." },
      { status: 400 },
    );
  }

  try {
    const [row] = await db
      .insert(allowedIps)
      .values({ ip, label })
      .returning();
    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    if (isMissingRelation(error)) {
      return NextResponse.json({ error: SCHEMA_HINT, schemaReady: false }, { status: 503 });
    }
    return NextResponse.json({ error: "Esa IP ya está autorizada." }, { status: 409 });
  }
}
