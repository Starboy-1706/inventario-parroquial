import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { items, photos, zones } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { slugify } from "@/lib/utils";
import { ZONE_COLORS, ZONE_ICONS } from "@/lib/constants";

type Ctx = { params: Promise<{ id: string }> };

async function parseId(ctx: Ctx) {
  const { id } = await ctx.params;
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function PATCH(_request: NextRequest, ctx: Ctx) {
  const id = await parseId(ctx);
  if (!id) return NextResponse.json({ error: "Zona no válida." }, { status: 400 });

  const body = await _request.json();
  const updates: Partial<typeof zones.$inferInsert> = {};

  if (typeof body.name === "string" && body.name.trim()) {
    updates.name = body.name.trim();
    updates.slug = slugify(body.name);
  }
  if (typeof body.description === "string") {
    updates.description = body.description.trim() || null;
  }
  if (typeof body.color === "string" && /^#[0-9A-Fa-f]{6}$/.test(body.color)) {
    updates.color = body.color;
  }
  if (ZONE_ICONS.includes(body.icon)) {
    updates.icon = body.icon;
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

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Sin cambios que aplicar." }, { status: 400 });
  }

  try {
    const [updated] = await db
      .update(zones)
      .set(updates)
      .where(eq(zones.id, id))
      .returning();
    if (!updated) {
      return NextResponse.json({ error: "Zona no encontrada." }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { error: "Ya existe una zona con ese nombre." },
      { status: 409 },
    );
  }
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const id = await parseId(ctx);
  if (!id) return NextResponse.json({ error: "Zona no válida." }, { status: 400 });

  const [count] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(items)
    .where(eq(items.zoneId, id));

  if (count.n > 0) {
    return NextResponse.json(
      {
        error: `La zona contiene ${count.n} artículo${count.n === 1 ? "" : "s"}. Trasládalos antes de eliminarla.`,
      },
      { status: 409 },
    );
  }

  const [deleted] = await db.delete(zones).where(eq(zones.id, id)).returning();
  if (!deleted) {
    return NextResponse.json({ error: "Zona no encontrada." }, { status: 404 });
  }
  // El color se conserva en la respuesta por compatibilidad de tipos
  void ZONE_COLORS;
  return NextResponse.json({ ok: true });
}
