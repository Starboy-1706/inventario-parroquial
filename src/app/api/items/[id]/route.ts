import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  itemPhotos,
  items,
  loans,
  maintenanceRecords,
  movements,
  photos,
  storageLocations,
  zones,
} from "@/db/schema";
import { apiAuthGuard } from "@/lib/auth";
import { itemUpdateSchema, zodErrorMessage } from "@/lib/validation";

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
  if (!id) return NextResponse.json({ error: "Artículo no válido." }, { status: 400 });

  const [row] = await db
    .select({ item: items, zone: zones, location: storageLocations })
    .from(items)
    .innerJoin(zones, eq(items.zoneId, zones.id))
    .leftJoin(storageLocations, eq(items.locationId, storageLocations.id))
    .where(eq(items.id, id));
  if (!row) return NextResponse.json({ error: "Artículo no encontrado." }, { status: 404 });

  const [history, gallery, loanRows, maintenance] = await Promise.all([
    db.select().from(movements).where(eq(movements.itemId, id)).orderBy(asc(movements.createdAt)),
    db
      .select({ photoId: itemPhotos.photoId, caption: itemPhotos.caption, isPrimary: itemPhotos.isPrimary })
      .from(itemPhotos)
      .where(eq(itemPhotos.itemId, id))
      .orderBy(asc(itemPhotos.sortOrder)),
    db.select().from(loans).where(eq(loans.itemId, id)).orderBy(asc(loans.lentAt)),
    db
      .select()
      .from(maintenanceRecords)
      .where(eq(maintenanceRecords.itemId, id))
      .orderBy(asc(maintenanceRecords.startedAt)),
  ]);
  return NextResponse.json({
    ...row.item,
    zone: row.zone,
    location: row.location,
    history,
    gallery,
    loans: loanRows,
    maintenance,
  });
}

function comparable(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  return value === null || value === undefined ? "" : String(value);
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const denied = await apiAuthGuard();
  if (denied) return denied;
  const id = await parseId(ctx);
  if (!id) return NextResponse.json({ error: "Artículo no válido." }, { status: 400 });

  const json = await request.json().catch(() => null);
  const parsed = itemUpdateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: zodErrorMessage(parsed.error) }, { status: 400 });
  }
  const data = parsed.data;
  const [current] = await db.select().from(items).where(eq(items.id, id));
  if (!current) return NextResponse.json({ error: "Artículo no encontrado." }, { status: 404 });
  if (current.deletedAt) {
    return NextResponse.json({ error: "Restaura el artículo antes de editarlo." }, { status: 409 });
  }
  if (current.version !== data.version) {
    return NextResponse.json(
      { error: "Otra persona modificó esta ficha. Recarga la página para no sobrescribir sus cambios." },
      { status: 409 },
    );
  }

  const effectiveZone = data.zoneId ?? current.zoneId;
  if (data.zoneId !== undefined) {
    const [zone] = await db.select({ id: zones.id }).from(zones).where(eq(zones.id, effectiveZone));
    if (!zone) return NextResponse.json({ error: "La zona de destino no existe." }, { status: 400 });
  }
  if (data.locationId) {
    const [location] = await db
      .select({ id: storageLocations.id })
      .from(storageLocations)
      .where(and(eq(storageLocations.id, data.locationId), eq(storageLocations.zoneId, effectiveZone)));
    if (!location) {
      return NextResponse.json({ error: "La ubicación detallada no pertenece a la zona." }, { status: 400 });
    }
  }

  const effectiveType = data.itemType ?? current.itemType;
  const quantity = effectiveType === "UNICO" ? 1 : data.quantity ?? current.quantity;
  const minQuantity = effectiveType === "UNICO" ? 0 : data.minQuantity ?? current.minQuantity;
  const photoIds = data.photoIds ? [...new Set(data.photoIds)] : undefined;
  if (photoIds?.length) {
    const existing = await db.select({ id: photos.id }).from(photos).where(inArray(photos.id, photoIds));
    if (existing.length !== photoIds.length) {
      return NextResponse.json({ error: "Alguna fotografía ya no existe." }, { status: 400 });
    }
  }

  const changes: string[] = [];
  const candidate = {
    name: data.name ?? current.name,
    description: data.description === undefined ? current.description : data.description,
    notes: data.notes === undefined ? current.notes : data.notes,
    category: data.category ?? current.category,
    zoneId: effectiveZone,
    locationId: data.locationId === undefined ? current.locationId : data.locationId,
    locationNote: data.locationNote === undefined ? current.locationNote : data.locationNote,
    photoId:
      data.photoId === undefined
        ? photoIds?.[0] ?? current.photoId
        : data.photoId,
    itemType: effectiveType,
    quantity,
    minQuantity,
    status: data.status ?? current.status,
    condition: data.condition ?? current.condition,
    acquisitionDate:
      data.acquisitionDate === undefined ? current.acquisitionDate : data.acquisitionDate,
    estimatedValue:
      data.estimatedValue === undefined
        ? current.estimatedValue
        : data.estimatedValue === null
          ? null
          : data.estimatedValue.toFixed(2),
    externalBarcode:
      data.externalBarcode === undefined ? current.externalBarcode : data.externalBarcode,
  };
  const labels: Record<keyof typeof candidate, string> = {
    name: "nombre",
    description: "descripción",
    notes: "notas",
    category: "categoría",
    zoneId: "zona",
    locationId: "ubicación",
    locationNote: "lugar exacto",
    photoId: "foto principal",
    itemType: "tipo",
    quantity: "cantidad",
    minQuantity: "stock mínimo",
    status: "estado",
    condition: "conservación",
    acquisitionDate: "fecha de adquisición",
    estimatedValue: "valor",
    externalBarcode: "código comercial",
  };
  for (const key of Object.keys(candidate) as (keyof typeof candidate)[]) {
    if (comparable(candidate[key]) !== comparable(current[key])) changes.push(labels[key]);
  }
  if (photoIds) changes.push("galería");
  if (changes.length === 0) {
    return NextResponse.json({ error: "No hay cambios que guardar." }, { status: 400 });
  }

  try {
    const updated = await db.transaction(async (tx) => {
      const [row] = await tx
        .update(items)
        .set({ ...candidate, version: sql`${items.version} + 1`, updatedAt: new Date() })
        .where(and(eq(items.id, id), eq(items.version, data.version)))
        .returning();
      if (!row) throw new Error("VERSION_CONFLICT");

      if (photoIds) {
        await tx.delete(itemPhotos).where(eq(itemPhotos.itemId, id));
        if (photoIds.length) {
          await tx.insert(itemPhotos).values(
            photoIds.map((photoId, index) => ({
              itemId: id,
              photoId,
              isPrimary: index === 0,
              sortOrder: index,
            })),
          );
        }
      }
      const movementRows: (typeof movements.$inferInsert)[] = [
        { itemId: id, type: "EDICION", note: `Campos modificados: ${changes.join(", ")}` },
      ];
      if (candidate.zoneId !== current.zoneId) {
        movementRows.push({ itemId: id, type: "TRASLADO", note: `Zona ${current.zoneId} → ${candidate.zoneId}` });
      }
      if (candidate.quantity !== current.quantity) {
        movementRows.push({
          itemId: id,
          type: "AJUSTE",
          quantity: Math.abs(candidate.quantity - current.quantity),
          note: `${current.quantity} → ${candidate.quantity} uds.`,
        });
      }
      if (candidate.status !== current.status) {
        movementRows.push({ itemId: id, type: candidate.status === "BAJA" ? "BAJA" : "ESTADO", note: `${current.status} → ${candidate.status}` });
      }
      await tx.insert(movements).values(movementRows);
      return row;
    });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Error && error.message === "VERSION_CONFLICT") {
      return NextResponse.json({ error: "La ficha cambió mientras editabas. Recárgala e inténtalo otra vez." }, { status: 409 });
    }
    console.error("[items/update]", error);
    return NextResponse.json({ error: "No se pudo guardar la ficha." }, { status: 500 });
  }
}

/** Envía a la papelera. El borrado físico solo se permite desde la papelera. */
export async function DELETE(request: NextRequest, ctx: Ctx) {
  const denied = await apiAuthGuard();
  if (denied) return denied;
  const id = await parseId(ctx);
  if (!id) return NextResponse.json({ error: "Artículo no válido." }, { status: 400 });
  const body = await request.json().catch(() => null) as { confirmationCode?: unknown; reason?: unknown } | null;
  const [current] = await db.select().from(items).where(eq(items.id, id));
  if (!current) return NextResponse.json({ error: "Artículo no encontrado." }, { status: 404 });
  if (body?.confirmationCode !== current.code) {
    return NextResponse.json({ error: `Debes confirmar con el código ${current.code}.` }, { status: 400 });
  }
  if (current.deletedAt) return NextResponse.json({ error: "El artículo ya está en la papelera." }, { status: 409 });

  const [deleted] = await db
    .update(items)
    .set({
      deletedAt: new Date(),
      deletedReason: typeof body.reason === "string" ? body.reason.trim().slice(0, 500) || null : null,
      status: "BAJA",
      version: sql`${items.version} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(items.id, id))
    .returning();
  await db.insert(movements).values({ itemId: id, type: "PAPELERA", note: deleted.deletedReason ?? "Enviado a papelera" });
  return NextResponse.json({ ok: true, item: deleted });
}
