import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  auditSessionItems,
  auditSessions,
  items,
  scanLogs,
  zones,
} from "@/db/schema";
import { extractCode } from "@/lib/utils";
import { apiAuthGuard } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, ctx: Ctx) {
  const denied = await apiAuthGuard();
  if (denied) return denied;

  const { id: raw } = await ctx.params;
  const sessionId = Number(raw);
  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    return NextResponse.json({ error: "Sesión no válida." }, { status: 400 });
  }

  const [session] = await db
    .select()
    .from(auditSessions)
    .where(eq(auditSessions.id, sessionId));

  if (!session || session.status !== "EN_CURSO") {
    return NextResponse.json(
      { error: "La sesión de recuento no existe o ya está finalizada." },
      { status: 400 },
    );
  }

  const body = await request.json().catch(() => null);
  const rawCode = String(body?.code ?? "").trim();
  const quantityInput = Math.max(1, Math.floor(Number(body?.quantity) || 1));
  const code = extractCode(rawCode);

  if (!code) {
    return NextResponse.json({ error: "Código escaneado no válido." }, { status: 400 });
  }

  // Buscar el artículo en toda la base de datos (por código permanente, código comercial o alias)
  const [matchedItem] = await db
    .select({ item: items, zone: zones })
    .from(items)
    .innerJoin(zones, eq(items.zoneId, zones.id))
    .where(
      and(
        isNull(items.deletedAt),
        or(
          eq(items.code, code),
          eq(items.externalBarcode, code),
          sql`exists (select 1 from item_code_aliases a where a.item_id = ${items.id} and upper(a.code) = upper(${code}))`,
        ),
      ),
    )
    .limit(1);

  // Registrar en bitácora de escaneos
  try {
    await db.insert(scanLogs).values({
      code,
      matchedItemId: matchedItem?.item.id ?? null,
      matchedZoneId: matchedItem?.zone.id ?? null,
      action: "AUDITORIA",
      actor: session.auditorName ?? "Recuento físico",
    });
  } catch {
    /* silent */
  }

  // 1. Si no existe ningún artículo con ese código
  if (!matchedItem) {
    const [unknownEntry] = await db
      .insert(auditSessionItems)
      .values({
        auditSessionId: sessionId,
        itemId: null,
        scannedCode: code,
        expectedQuantity: 0,
        scannedQuantity: quantityInput,
        status: "DESCONOCIDO",
        notes: "Código no registrado en el inventario",
      })
      .returning();

    return NextResponse.json({
      result: "DESCONOCIDO",
      message: `El código ${code} no está registrado en el inventario.`,
      entry: unknownEntry,
    });
  }

  // 2. Si el artículo pertenece a OTRA zona
  if (matchedItem.zone.id !== session.zoneId) {
    const [existingCheck] = await db
      .select()
      .from(auditSessionItems)
      .where(
        and(
          eq(auditSessionItems.auditSessionId, sessionId),
          eq(auditSessionItems.itemId, matchedItem.item.id),
        ),
      );

    let entry;
    if (existingCheck) {
      [entry] = await db
        .update(auditSessionItems)
        .set({
          scannedQuantity: existingCheck.scannedQuantity + quantityInput,
          scannedAt: new Date(),
        })
        .where(eq(auditSessionItems.id, existingCheck.id))
        .returning();
    } else {
      [entry] = await db
        .insert(auditSessionItems)
        .values({
          auditSessionId: sessionId,
          itemId: matchedItem.item.id,
          scannedCode: matchedItem.item.code,
          expectedQuantity: 0,
          scannedQuantity: quantityInput,
          status: "FUERA_DE_ZONA",
          notes: `Pertenece a la zona: ${matchedItem.zone.name}`,
        })
        .returning();
    }

    return NextResponse.json({
      result: "FUERA_DE_ZONA",
      message: `¡Atención! Este artículo pertenece a la zona «${matchedItem.zone.name}».`,
      item: matchedItem.item,
      entry,
    });
  }

  // 3. El artículo pertenece a ESTA zona
  const [existingCheck] = await db
    .select()
    .from(auditSessionItems)
    .where(
      and(
        eq(auditSessionItems.auditSessionId, sessionId),
        eq(auditSessionItems.itemId, matchedItem.item.id),
      ),
    );

  let entry;
  if (existingCheck) {
    const newQuantity =
      matchedItem.item.itemType === "UNICO"
        ? 1
        : existingCheck.scannedQuantity + quantityInput;

    const status =
      matchedItem.item.itemType === "UNICO"
        ? "CORRECTO"
        : newQuantity === existingCheck.expectedQuantity
          ? "CORRECTO"
          : "DISCREPANCIA_CANTIDAD";

    [entry] = await db
      .update(auditSessionItems)
      .set({
        scannedQuantity: newQuantity,
        status,
        scannedAt: new Date(),
      })
      .where(eq(auditSessionItems.id, existingCheck.id))
      .returning();
  } else {
    // Artículo en esta zona pero no estaba en la lista inicial (ej. dado de alta durante el recuento)
    [entry] = await db
      .insert(auditSessionItems)
      .values({
        auditSessionId: sessionId,
        itemId: matchedItem.item.id,
        scannedCode: matchedItem.item.code,
        expectedQuantity: matchedItem.item.quantity,
        scannedQuantity: quantityInput,
        status:
          quantityInput === matchedItem.item.quantity
            ? "CORRECTO"
            : "DISCREPANCIA_CANTIDAD",
      })
      .returning();
  }

  return NextResponse.json({
    result: entry.status,
    message:
      entry.status === "CORRECTO"
        ? `«${matchedItem.item.name}» verificado correctamente.`
        : `Discrepancia en «${matchedItem.item.name}»: se esperaban ${entry.expectedQuantity}, se han contado ${entry.scannedQuantity}.`,
    item: matchedItem.item,
    entry,
  });
}
