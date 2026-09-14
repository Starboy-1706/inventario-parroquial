import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { items, storageLocations } from "@/db/schema";
import { apiAuthGuard } from "@/lib/auth";
import { LOCATION_KINDS, type LocationKind } from "@/lib/constants";

type Ctx = { params: Promise<{ id: string }> };

async function parseId(ctx: Ctx) {
  const { id } = await ctx.params;
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** Renombrar una ubicación o cambiar su tipo (armario, archivero, cajón…). */
export async function PATCH(request: NextRequest, ctx: Ctx) {
  const denied = await apiAuthGuard();
  if (denied) return denied;
  const id = await parseId(ctx);
  if (!id) return NextResponse.json({ error: "Ubicación no válida." }, { status: 400 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Datos no válidos." }, { status: 400 });
  }

  const updates: Partial<typeof storageLocations.$inferInsert> = {};
  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (!name || name.length > 100) {
      return NextResponse.json(
        { error: "El nombre debe tener entre 1 y 100 caracteres." },
        { status: 400 },
      );
    }
    updates.name = name;
  }
  if (typeof body.kind === "string") {
    if (!LOCATION_KINDS.includes(body.kind as LocationKind)) {
      return NextResponse.json({ error: "Tipo de ubicación no válido." }, { status: 400 });
    }
    updates.kind = body.kind;
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Sin cambios que aplicar." }, { status: 400 });
  }

  try {
    const [row] = await db
      .update(storageLocations)
      .set(updates)
      .where(eq(storageLocations.id, id))
      .returning();
    if (!row) return NextResponse.json({ error: "No encontrada." }, { status: 404 });
    return NextResponse.json(row);
  } catch {
    return NextResponse.json(
      { error: "Ya existe otra ubicación con ese nombre en el mismo lugar." },
      { status: 409 },
    );
  }
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const denied = await apiAuthGuard();
  if (denied) return denied;
  const id = await parseId(ctx);
  if (!id) return NextResponse.json({ error: "Ubicación no válida." }, { status: 400 });

  const [count] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(items)
    .where(eq(items.locationId, id));
  if (count.n) {
    return NextResponse.json(
      { error: `La ubicación contiene ${count.n} artículo(s). Muévelos antes de eliminarla.` },
      { status: 409 },
    );
  }

  const [children] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(storageLocations)
    .where(eq(storageLocations.parentId, id));
  if (children.n) {
    return NextResponse.json(
      { error: `Contiene ${children.n} sububicación(es). Elimínalas primero.` },
      { status: 409 },
    );
  }

  const [row] = await db
    .delete(storageLocations)
    .where(eq(storageLocations.id, id))
    .returning();
  return row
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: "No encontrada." }, { status: 404 });
}
