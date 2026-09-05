import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { items, movements } from "@/db/schema";
import { eq } from "drizzle-orm";
import { apiAuthGuard } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

/** Ajuste de existencias atómico con bloqueo de fila (evita doble retirada). */
export async function POST(request: NextRequest, ctx: Ctx) {
  const denied = await apiAuthGuard();
  if (denied) return denied;

  const { id: raw } = await ctx.params;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Artículo no válido." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Ajuste no válido." }, { status: 400 });
  }

  const hasSet = Object.prototype.hasOwnProperty.call(body, "set");
  const rawValue = Number(hasSet ? body.set : body.delta);
  if (!Number.isFinite(rawValue) || !Number.isInteger(rawValue)) {
    return NextResponse.json(
      { error: "La cantidad debe ser un número entero." },
      { status: 400 },
    );
  }
  if (Math.abs(rawValue) > 1_000_000) {
    return NextResponse.json(
      { error: "La cantidad supera el máximo permitido." },
      { status: 400 },
    );
  }
  if (!hasSet && rawValue === 0) {
    return NextResponse.json({ error: "El ajuste no puede ser cero." }, { status: 400 });
  }
  if (hasSet && rawValue < 0) {
    return NextResponse.json({ error: "El recuento no puede ser negativo." }, { status: 400 });
  }

  const note =
    typeof body.note === "string" ? body.note.trim().slice(0, 500) || null : null;

  try {
    const updated = await db.transaction(async (tx) => {
      // Dos peticiones simultáneas se procesan una detrás de otra.
      const [item] = await tx
        .select()
        .from(items)
        .where(eq(items.id, id))
        .for("update");

      if (!item) throw new Error("ITEM_NOT_FOUND");
      if (item.itemType !== "CONTABLE") throw new Error("NOT_COUNTABLE");

      const newQty = hasSet ? rawValue : item.quantity + rawValue;
      if (newQty < 0) throw new Error(`INSUFFICIENT:${item.quantity}`);
      if (newQty === item.quantity) throw new Error("NO_CHANGE");

      const moved = newQty - item.quantity;
      const type = hasSet ? "AJUSTE" : moved > 0 ? "ENTRADA" : "SALIDA";
      const [row] = await tx
        .update(items)
        .set({ quantity: newQty, updatedAt: new Date() })
        .where(eq(items.id, id))
        .returning();

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

    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "ITEM_NOT_FOUND") {
      return NextResponse.json({ error: "Artículo no encontrado." }, { status: 404 });
    }
    if (message === "NOT_COUNTABLE") {
      return NextResponse.json(
        { error: "Las piezas únicas no admiten ajuste de cantidad." },
        { status: 400 },
      );
    }
    if (message === "NO_CHANGE") {
      return NextResponse.json({ error: "El recuento ya tiene ese valor." }, { status: 400 });
    }
    if (message.startsWith("INSUFFICIENT:")) {
      const available = message.split(":")[1];
      return NextResponse.json(
        { error: `Stock insuficiente: solo quedan ${available} unidades.` },
        { status: 400 },
      );
    }
    console.error("[stock/adjust]", error);
    return NextResponse.json(
      { error: "No se pudo actualizar el stock." },
      { status: 500 },
    );
  }
}
