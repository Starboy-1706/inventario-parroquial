import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { items, movements } from "@/db/schema";
import { apiAuthGuard } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

async function getId(ctx: Ctx) {
  const { id } = await ctx.params;
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function POST(request: NextRequest, ctx: Ctx) {
  const denied = await apiAuthGuard();
  if (denied) return denied;
  const id = await getId(ctx);
  if (!id) return NextResponse.json({ error: "Artículo no válido." }, { status: 400 });
  const body = await request.json().catch(() => null) as { confirmationCode?: unknown } | null;
  const [item] = await db.select().from(items).where(eq(items.id, id));
  if (!item) return NextResponse.json({ error: "Artículo no encontrado." }, { status: 404 });
  if (body?.confirmationCode !== item.code) {
    return NextResponse.json({ error: `Confirma con ${item.code}.` }, { status: 400 });
  }
  if (!item.deletedAt) return NextResponse.json({ error: "El artículo no está en la papelera." }, { status: 409 });

  const [restored] = await db
    .update(items)
    .set({
      deletedAt: null,
      deletedReason: null,
      status: "DISPONIBLE",
      version: sql`${items.version} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(items.id, id))
    .returning();
  await db.insert(movements).values({ itemId: id, type: "RESTAURACION", note: "Restaurado desde la papelera" });
  return NextResponse.json(restored);
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  const denied = await apiAuthGuard();
  if (denied) return denied;
  const id = await getId(ctx);
  if (!id) return NextResponse.json({ error: "Artículo no válido." }, { status: 400 });
  const body = await request.json().catch(() => null) as { confirmationCode?: unknown } | null;
  const [item] = await db.select().from(items).where(eq(items.id, id));
  if (!item) return NextResponse.json({ error: "Artículo no encontrado." }, { status: 404 });
  if (!item.deletedAt) {
    return NextResponse.json({ error: "Primero envía el artículo a la papelera." }, { status: 409 });
  }
  if (body?.confirmationCode !== item.code) {
    return NextResponse.json({ error: `Confirma con ${item.code}.` }, { status: 400 });
  }
  await db.delete(items).where(eq(items.id, id));
  return NextResponse.json({ ok: true });
}
