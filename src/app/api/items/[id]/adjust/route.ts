import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { items, movements } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { apiIpGuard } from "@/lib/access";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Ajuste de existencias en transacción ACID.
 * body: { delta?: number, set?: number, note?: string }
 *  - delta: entradas/salidas relativas (+5 / -2)  → ENTRADA / SALIDA
 *  - set:   recuento absoluto                      → AJUSTE
 */
export async function POST(request: NextRequest, ctx: Ctx) {
  const denied = await apiIpGuard();
  if (denied) return denied;
  const { id: raw } = await ctx.params;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Artículo no válido." }, { status: 400 });
  }

  const [item] = await db.select().from(items).where(eq(items.id, id));
  if (!item) {
    return NextResponse.json({ error: "Artículo no encontrado." }, { status: 404 });
  }
  if (item.itemType !== "CONTABLE") {
    return NextResponse.json(
      { error: "Las piezas únicas no admiten ajuste de cantidad." },
      { status: 400 },
    );
  }

  const body = await request.json();
  const note = typeof body.note === "string" ? body.note.trim() : null;

  let newQty: number;
  let type: "ENTRADA" | "SALIDA" | "AJUSTE";
  let moved = 0;

  if (body.set !== undefined) {
    newQty = Math.max(0, Math.floor(Number(body.set) || 0));
    type = "AJUSTE";
    moved = newQty - item.quantity;
  } else {
    const delta = Math.floor(Number(body.delta) || 0);
    if (delta === 0) {
      return NextResponse.json({ error: "El ajuste no puede ser cero." }, { status: 400 });
    }
    newQty = item.quantity + delta;
    if (newQty < 0) {
      return NextResponse.json(
        { error: `Stock insuficiente: solo quedan ${item.quantity} unidades.` },
        { status: 400 },
      );
    }
    type = delta > 0 ? "ENTRADA" : "SALIDA";
    moved = delta;
  }

  const updated = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(items)
      .set({ quantity: newQty, updatedAt: new Date() })
      .where(eq(items.id, id))
      .returning();

    // Garantía de consistencia: nunca stock negativo
    if (row.quantity < 0) {
      tx.rollback();
    }

    await tx.insert(movements).values({
      itemId: id,
      type,
      quantity: Math.abs(moved),
      note:
        note ??
        (type === "AJUSTE"
          ? `Recuento físico: ${item.quantity} → ${newQty}`
          : `${moved > 0 ? "+" : ""}${moved} uds · ${item.quantity} → ${newQty}`),
    });

    return row;
  });

  void sql;
  return NextResponse.json(updated);
}
