import { NextRequest, NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { storageLocations, zones } from "@/db/schema";
import { apiAuthGuard } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const denied = await apiAuthGuard(); if (denied) return denied;
  const zoneId = Number(request.nextUrl.searchParams.get("zone"));
  const query = db.select().from(storageLocations).orderBy(asc(storageLocations.name));
  return NextResponse.json(Number.isInteger(zoneId) && zoneId > 0 ? await query.where(eq(storageLocations.zoneId, zoneId)) : await query);
}
export async function POST(request: NextRequest) {
  const denied = await apiAuthGuard(); if (denied) return denied;
  const body = await request.json().catch(() => null); const zoneId = Number(body?.zoneId); const parentId = body?.parentId ? Number(body.parentId) : null; const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 100 || !Number.isInteger(zoneId)) return NextResponse.json({ error: "Datos de ubicación no válidos." }, { status: 400 });
  const [zone] = await db.select({ id: zones.id }).from(zones).where(eq(zones.id, zoneId)); if (!zone) return NextResponse.json({ error: "Zona no encontrada." }, { status: 400 });
  if (parentId) { const [parent] = await db.select().from(storageLocations).where(eq(storageLocations.id, parentId)); if (!parent || parent.zoneId !== zoneId) return NextResponse.json({ error: "La ubicación padre no pertenece a esa zona." }, { status: 400 }); }
  try { const [row] = await db.insert(storageLocations).values({ zoneId, parentId, name, kind: String(body.kind ?? "OTRO").slice(0, 30) }).returning(); return NextResponse.json(row, { status: 201 }); }
  catch { return NextResponse.json({ error: "Ya existe esa ubicación." }, { status: 409 }); }
}
