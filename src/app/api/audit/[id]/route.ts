import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  auditSessionItems,
  auditSessions,
  items,
  movements,
  zones,
} from "@/db/schema";
import { apiAuthGuard } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

async function parseId(ctx: Ctx) {
  const { id } = await ctx.params;
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function GET(_request: NextRequest, ctx: Ctx) {
  const denied = await apiAuthGuard();
  if (denied) return denied;

  const id = await parseId(ctx);
  if (!id) return NextResponse.json({ error: "Sesión no válida." }, { status: 400 });

  const [sessionRow] = await db
    .select({
      session: auditSessions,
      zoneName: zones.name,
      zoneColor: zones.color,
    })
    .from(auditSessions)
    .innerJoin(zones, eq(auditSessions.zoneId, zones.id))
    .where(eq(auditSessions.id, id));

  if (!sessionRow) {
    return NextResponse.json({ error: "Sesión de recuento no encontrada." }, { status: 404 });
  }

  const checklist = await db
    .select({
      checkItem: auditSessionItems,
      itemName: items.name,
      itemType: items.itemType,
      itemCategory: items.category,
      itemPhotoId: items.photoId,
    })
    .from(auditSessionItems)
    .leftJoin(items, eq(auditSessionItems.itemId, items.id))
    .where(eq(auditSessionItems.auditSessionId, id))
    .orderBy(asc(auditSessionItems.id));

  return NextResponse.json({
    ...sessionRow.session,
    zoneName: sessionRow.zoneName,
    zoneColor: sessionRow.zoneColor,
    checklist: checklist.map((c) => ({
      ...c.checkItem,
      name: c.itemName ?? c.checkItem.scannedCode,
      itemType: c.itemType ?? "UNICO",
      category: c.itemCategory ?? "General",
      photoId: c.itemPhotoId,
    })),
  });
}

/** Finalizar o cancelar la sesión de recuento */
export async function POST(request: NextRequest, ctx: Ctx) {
  const denied = await apiAuthGuard();
  if (denied) return denied;

  const id = await parseId(ctx);
  if (!id) return NextResponse.json({ error: "Sesión no válida." }, { status: 400 });

  const body = await request.json().catch(() => null);
  const action = body?.action === "CANCELAR" ? "CANCELADO" : "COMPLETADO";
  const autoAdjust = Boolean(body?.autoAdjust);

  const [session] = await db.select().from(auditSessions).where(eq(auditSessions.id, id));
  if (!session) {
    return NextResponse.json({ error: "Sesión no encontrada." }, { status: 404 });
  }

  const checklist = await db
    .select()
    .from(auditSessionItems)
    .where(eq(auditSessionItems.auditSessionId, id));

  const totalScanned = checklist.filter((c) => c.status !== "FALTANTE").length;
  const discrepancies = checklist.filter(
    (c) => c.status !== "CORRECTO" && c.status !== "EN_CURSO",
  ).length;

  const updated = await db.transaction(async (tx) => {
    // Si se solicitó auto-ajustar discrepancias de cantidad encontradas
    if (action === "COMPLETADO" && autoAdjust) {
      for (const item of checklist) {
        if (
          item.itemId &&
          (item.status === "DISCREPANCIA_CANTIDAD" || item.status === "CORRECTO") &&
          item.scannedQuantity !== item.expectedQuantity
        ) {
          await tx
            .update(items)
            .set({
              quantity: item.scannedQuantity,
              version: sql`${items.version} + 1`,
              updatedAt: new Date(),
            })
            .where(eq(items.id, item.itemId));

          await tx.insert(movements).values({
            itemId: item.itemId,
            type: "AJUSTE",
            quantity: Math.abs(item.scannedQuantity - item.expectedQuantity),
            note: `Ajuste automático por recuento físico en zona #${session.zoneId}: ${item.expectedQuantity} → ${item.scannedQuantity} uds.`,
          });
        }
      }
    }

    const [completed] = await tx
      .update(auditSessions)
      .set({
        status: action,
        completedAt: new Date(),
        totalScanned,
        totalDiscrepancies: discrepancies,
      })
      .where(eq(auditSessions.id, id))
      .returning();

    return completed;
  });

  return NextResponse.json(updated);
}
