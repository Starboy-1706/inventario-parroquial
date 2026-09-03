import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { items, movements, photos, zones } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { CONDITIONS, STATUSES } from "@/lib/constants";
import { apiIpGuard } from "@/lib/access";

type Ctx = { params: Promise<{ id: string }> };

async function parseId(ctx: Ctx) {
  const { id } = await ctx.params;
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function GET(_request: NextRequest, ctx: Ctx) {
  const denied = await apiIpGuard();
  if (denied) return denied;
  const id = await parseId(ctx);
  if (!id) return NextResponse.json({ error: "Artículo no válido." }, { status: 400 });

  const [row] = await db
    .select({ item: items, zone: zones })
    .from(items)
    .innerJoin(zones, eq(items.zoneId, zones.id))
    .where(eq(items.id, id));

  if (!row) {
    return NextResponse.json({ error: "Artículo no encontrado." }, { status: 404 });
  }

  const history = await db
    .select()
    .from(movements)
    .where(eq(movements.itemId, id))
    .orderBy(asc(movements.createdAt));

  return NextResponse.json({ ...row.item, zone: row.zone, history });
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const denied = await apiIpGuard();
  if (denied) return denied;
  const id = await parseId(ctx);
  if (!id) return NextResponse.json({ error: "Artículo no válido." }, { status: 400 });

  const [current] = await db.select().from(items).where(eq(items.id, id));
  if (!current) {
    return NextResponse.json({ error: "Artículo no encontrado." }, { status: 404 });
  }

  const body = await request.json();
  const updates: Partial<typeof items.$inferInsert> = {};
  const movementRows: (typeof movements.$inferInsert)[] = [];

  if (typeof body.name === "string" && body.name.trim()) updates.name = body.name.trim();
  if (typeof body.description === "string") updates.description = body.description.trim() || null;
  if (typeof body.category === "string" && body.category.trim()) updates.category = body.category.trim();
  if (typeof body.notes === "string") updates.notes = body.notes.trim() || null;
  if (typeof body.acquisitionDate === "string")
    updates.acquisitionDate = body.acquisitionDate || null;

  if (body.itemType === "UNICO" || body.itemType === "CONTABLE") {
    updates.itemType = body.itemType;
    if (body.itemType === "UNICO") updates.quantity = 1;
  }

  if (body.minQuantity !== undefined) {
    const min = Math.max(0, Math.floor(Number(body.minQuantity) || 0));
    updates.minQuantity = min;
  }

  if (body.quantity !== undefined) {
    const q = Math.max(0, Math.floor(Number(body.quantity) || 0));
    updates.quantity = current.itemType === "UNICO" ? 1 : q;
  }

  if (body.estimatedValue !== undefined) {
    const v = Number(body.estimatedValue);
    updates.estimatedValue =
      Number.isFinite(v) && v >= 0 && body.estimatedValue !== "" && body.estimatedValue !== null
        ? v.toFixed(2)
        : null;
  }

  if (
    typeof body.condition === "string" &&
    (CONDITIONS as readonly string[]).includes(body.condition)
  ) {
    updates.condition = body.condition;
  }

  // photoId: null → quitar foto · number → asignar foto existente
  if ("photoId" in body) {
    if (body.photoId === null) {
      updates.photoId = null;
    } else {
      const pid = Number(body.photoId);
      if (!Number.isInteger(pid) || pid <= 0) {
        return NextResponse.json({ error: "Foto no válida." }, { status: 400 });
      }
      const [photo] = await db
        .select({ id: photos.id })
        .from(photos)
        .where(eq(photos.id, pid));
      if (!photo) {
        return NextResponse.json(
          { error: "La fotografía indicada no existe." },
          { status: 400 },
        );
      }
      updates.photoId = pid;
    }
  }

  if (
    typeof body.status === "string" &&
    (STATUSES as readonly string[]).includes(body.status) &&
    body.status !== current.status
  ) {
    updates.status = body.status;
    movementRows.push({
      itemId: id,
      type: body.status === "BAJA" ? "BAJA" : "ESTADO",
      quantity: 0,
      note: body.statusNote
        ? String(body.statusNote)
        : `${current.status} → ${body.status}`,
    });
  }

  if (body.zoneId !== undefined) {
    const zoneId = Number(body.zoneId);
    if (Number.isInteger(zoneId) && zoneId > 0 && zoneId !== current.zoneId) {
      const [fromZone] = await db.select().from(zones).where(eq(zones.id, current.zoneId));
      const [toZone] = await db.select().from(zones).where(eq(zones.id, zoneId));
      if (!toZone) {
        return NextResponse.json({ error: "La zona de destino no existe." }, { status: 400 });
      }
      updates.zoneId = zoneId;
      movementRows.push({
        itemId: id,
        type: "TRASLADO",
        quantity: 0,
        note: `${fromZone?.name ?? "?"} → ${toZone.name}`,
      });
    }
  }

  if (Object.keys(updates).length === 0 && movementRows.length === 0) {
    return NextResponse.json({ error: "Sin cambios que aplicar." }, { status: 400 });
  }

  updates.updatedAt = new Date();

  const updated = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(items)
      .set(updates)
      .where(eq(items.id, id))
      .returning();
    if (movementRows.length) await tx.insert(movements).values(movementRows);
    return row;
  });

  return NextResponse.json(updated);
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const denied = await apiIpGuard();
  if (denied) return denied;
  const id = await parseId(ctx);
  if (!id) return NextResponse.json({ error: "Artículo no válido." }, { status: 400 });

  const [deleted] = await db.delete(items).where(eq(items.id, id)).returning();
  if (!deleted) {
    return NextResponse.json({ error: "Artículo no encontrado." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
