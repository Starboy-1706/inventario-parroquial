import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { items, movements, photos, zones } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { CONDITIONS, STATUSES } from "@/lib/constants";
import { apiAuthGuard } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

/** Dinero en formato español: "1.200,50" | "1200.5" | number → número limpio. */
function parseMoneyValue(raw: unknown): { ok: boolean; value: number | null } {
  if (raw === null || raw === undefined || raw === "") return { ok: true, value: null };
  if (typeof raw === "number") {
    return Number.isFinite(raw) && raw >= 0 && raw <= 100_000_000
      ? { ok: true, value: raw }
      : { ok: false, value: null };
  }
  if (typeof raw === "string") {
    const clean = raw.trim().replace(/\s|€/g, "");
    if (!clean) return { ok: true, value: null };
    const num = clean.includes(",")
      ? Number(clean.replace(/\./g, "").replace(",", "."))
      : Number(clean);
    return Number.isFinite(num) && num >= 0 && num <= 100_000_000
      ? { ok: true, value: num }
      : { ok: false, value: null };
  }
  return { ok: false, value: null };
}

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
  const denied = await apiAuthGuard();
  if (denied) return denied;
  const id = await parseId(ctx);
  if (!id) return NextResponse.json({ error: "Artículo no válido." }, { status: 400 });

  const [current] = await db.select().from(items).where(eq(items.id, id));
  if (!current) {
    return NextResponse.json({ error: "Artículo no encontrado." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Datos de artículo no válidos." }, { status: 400 });
  }

  const updates: Partial<typeof items.$inferInsert> = {};
  const movementRows: (typeof movements.$inferInsert)[] = [];

  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (!name) {
      return NextResponse.json({ error: "El nombre no puede estar vacío." }, { status: 400 });
    }
    if (name.length > 160) {
      return NextResponse.json({ error: "El nombre es demasiado largo." }, { status: 400 });
    }
    updates.name = name;
  }
  if (typeof body.description === "string") {
    if (body.description.length > 2_000) {
      return NextResponse.json({ error: "La descripción es demasiado larga." }, { status: 400 });
    }
    updates.description = body.description.trim() || null;
  }
  if (typeof body.category === "string" && body.category.trim()) {
    updates.category = body.category.trim().slice(0, 120);
  }
  if (typeof body.notes === "string") {
    if (body.notes.length > 2_000) {
      return NextResponse.json({ error: "Las notas son demasiado largas." }, { status: 400 });
    }
    updates.notes = body.notes.trim() || null;
  }
  if (typeof body.acquisitionDate === "string") {
    if (body.acquisitionDate && !/^\d{4}-\d{2}-\d{2}$/.test(body.acquisitionDate)) {
      return NextResponse.json({ error: "La fecha no tiene un formato válido." }, { status: 400 });
    }
    updates.acquisitionDate = body.acquisitionDate || null;
  }

  const effectiveType =
    body.itemType === "UNICO" || body.itemType === "CONTABLE"
      ? body.itemType
      : current.itemType;
  if (effectiveType !== current.itemType) updates.itemType = effectiveType;

  if (body.minQuantity !== undefined) {
    const rawMin = Number(body.minQuantity);
    if (!Number.isFinite(rawMin) || rawMin < 0 || rawMin > 1_000_000) {
      return NextResponse.json(
        { error: "El stock mínimo debe estar entre 0 y 1.000.000." },
        { status: 400 },
      );
    }
    updates.minQuantity = effectiveType === "UNICO" ? 0 : Math.floor(rawMin);
  }

  const rawQuantity = body.quantity !== undefined ? Number(body.quantity) : current.quantity;
  if (
    effectiveType === "CONTABLE" &&
    (!Number.isFinite(rawQuantity) || rawQuantity < 0 || rawQuantity > 1_000_000)
  ) {
    return NextResponse.json(
      { error: "La cantidad debe estar entre 0 y 1.000.000." },
      { status: 400 },
    );
  }
  const requestedQuantity =
    effectiveType === "UNICO" ? 1 : Math.floor(rawQuantity);
  if (requestedQuantity !== current.quantity) {
    updates.quantity = requestedQuantity;
    movementRows.push({
      itemId: id,
      type: "AJUSTE",
      quantity: Math.abs(requestedQuantity - current.quantity),
      note: `Edición de ficha: ${current.quantity} → ${requestedQuantity} uds.`,
    });
  }

  if (body.estimatedValue !== undefined) {
    const money = parseMoneyValue(body.estimatedValue);
    if (!money.ok) {
      return NextResponse.json(
        { error: "El valor estimado no es válido. Ejemplo: 1.200,50" },
        { status: 400 },
      );
    }
    updates.estimatedValue = money.value !== null ? money.value.toFixed(2) : null;
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
        ? String(body.statusNote).slice(0, 500)
        : `${current.status} → ${body.status}`,
    });
  }

  if (body.zoneId !== undefined) {
    const zoneId = Number(body.zoneId);
    if (!Number.isInteger(zoneId) || zoneId <= 0) {
      return NextResponse.json({ error: "La zona indicada no es válida." }, { status: 400 });
    }
    if (zoneId !== current.zoneId) {
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
  const denied = await apiAuthGuard();
  if (denied) return denied;
  const id = await parseId(ctx);
  if (!id) return NextResponse.json({ error: "Artículo no válido." }, { status: 400 });

  const [deleted] = await db.delete(items).where(eq(items.id, id)).returning();
  if (!deleted) {
    return NextResponse.json({ error: "Artículo no encontrado." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
