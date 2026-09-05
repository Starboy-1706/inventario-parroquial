import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { items, movements, zones } from "@/db/schema";
import { apiAuthGuard } from "@/lib/auth";
import { STATUSES } from "@/lib/constants";

export async function POST(request: NextRequest) {
  const denied = await apiAuthGuard();
  if (denied) return denied;
  const body = await request.json().catch(() => null) as {
    ids?: unknown; action?: unknown; zoneId?: unknown; status?: unknown;
  } | null;
  const ids: number[] = Array.isArray(body?.ids)
    ? [...new Set(body.ids.map(Number).filter((x): x is number => Number.isInteger(x) && x > 0))].slice(0, 100)
    : [];
  if (!ids.length) {
    return NextResponse.json({ error: "Selecciona al menos un artículo." }, { status: 400 });
  }

  if (body?.action === "ZONE") {
    const zoneId = Number(body.zoneId);
    const [zone] = await db.select().from(zones).where(eq(zones.id, zoneId));
    if (!zone) return NextResponse.json({ error: "Zona no válida." }, { status: 400 });
    await db.transaction(async (tx) => {
      const affected = await tx
        .update(items)
        .set({ zoneId, locationId: null, version: sql`${items.version} + 1`, updatedAt: new Date() })
        .where(and(inArray(items.id, ids), isNull(items.deletedAt)))
        .returning({ id: items.id });
      if (affected.length) {
        await tx.insert(movements).values(
          affected.map((x) => ({ itemId: x.id, type: "TRASLADO", note: `Traslado por lote a ${zone.name}` })),
        );
      }
    });
  } else if (
    body?.action === "STATUS" &&
    typeof body.status === "string" &&
    (STATUSES as readonly string[]).includes(body.status)
  ) {
    const status = body.status;
    await db.transaction(async (tx) => {
      const affected = await tx
        .update(items)
        .set({ status, version: sql`${items.version} + 1`, updatedAt: new Date() })
        .where(and(inArray(items.id, ids), isNull(items.deletedAt)))
        .returning({ id: items.id });
      if (affected.length) {
        await tx.insert(movements).values(
          affected.map((x) => ({ itemId: x.id, type: "ESTADO", note: `Cambio por lote → ${status}` })),
        );
      }
    });
  } else {
    return NextResponse.json({ error: "Acción por lote no válida." }, { status: 400 });
  }
  return NextResponse.json({ ok: true, count: ids.length });
}
