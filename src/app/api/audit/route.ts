import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { auditSessionItems, auditSessions, items, zones } from "@/db/schema";
import { apiAuthGuard } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await apiAuthGuard();
  if (denied) return denied;

  const rows = await db
    .select({
      session: auditSessions,
      zoneName: zones.name,
      zoneColor: zones.color,
    })
    .from(auditSessions)
    .innerJoin(zones, eq(auditSessions.zoneId, zones.id))
    .orderBy(desc(auditSessions.startedAt))
    .limit(30);

  return NextResponse.json(
    rows.map((r) => ({
      ...r.session,
      zoneName: r.zoneName,
      zoneColor: r.zoneColor,
    })),
  );
}

export async function POST(request: NextRequest) {
  const denied = await apiAuthGuard();
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  const zoneId = Number(body?.zoneId);
  const auditorName = String(body?.auditorName ?? "").trim() || "Responsable de zona";
  const notes = String(body?.notes ?? "").trim() || null;

  if (!Number.isInteger(zoneId) || zoneId <= 0) {
    return NextResponse.json({ error: "Selecciona una zona para el recuento." }, { status: 400 });
  }

  const [zone] = await db.select().from(zones).where(eq(zones.id, zoneId));
  if (!zone) {
    return NextResponse.json({ error: "La zona seleccionada no existe." }, { status: 400 });
  }

  // Cargar todos los artículos activos actuales en esta zona
  const expectedItems = await db
    .select()
    .from(items)
    .where(and(eq(items.zoneId, zoneId), isNull(items.deletedAt)));

  const session = await db.transaction(async (tx) => {
    const [newSession] = await tx
      .insert(auditSessions)
      .values({
        zoneId,
        status: "EN_CURSO",
        totalExpected: expectedItems.length,
        totalScanned: 0,
        totalDiscrepancies: 0,
        auditorName,
        notes,
      })
      .returning();

    if (expectedItems.length > 0) {
      await tx.insert(auditSessionItems).values(
        expectedItems.map((item) => ({
          auditSessionId: newSession.id,
          itemId: item.id,
          scannedCode: item.code,
          expectedQuantity: item.quantity,
          scannedQuantity: 0,
          status: "FALTANTE",
        })),
      );
    }

    return newSession;
  });

  return NextResponse.json(session, { status: 201 });
}
