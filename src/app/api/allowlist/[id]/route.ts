import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { allowedIps } from "@/db/schema";
import { apiIpGuard, getClientIp } from "@/lib/access";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const denied = await apiIpGuard();
  if (denied) return denied;

  const { id: raw } = await ctx.params;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Entrada no válida." }, { status: 400 });
  }

  const [entry] = await db.select().from(allowedIps).where(eq(allowedIps.id, id));
  if (!entry) {
    return NextResponse.json({ error: "Entrada no encontrada." }, { status: 404 });
  }

  // Salvaguarda: no puedes expulsar tu propio dispositivo
  const client = await getClientIp();
  if (entry.ip === client.ip) {
    return NextResponse.json(
      { error: "No puedes eliminar la IP del dispositivo que estás usando ahora." },
      { status: 409 },
    );
  }

  const [count] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(allowedIps);
  if (count.n <= 1) {
    return NextResponse.json(
      { error: "Debe quedar al menos una IP autorizada (si no, la app vuelve al modo abierto)." },
      { status: 409 },
    );
  }

  await db.delete(allowedIps).where(eq(allowedIps.id, id));
  return NextResponse.json({ ok: true });
}
