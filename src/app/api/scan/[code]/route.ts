import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { items, zones } from "@/db/schema";
import { eq } from "drizzle-orm";
import { extractCode } from "@/lib/utils";

type Ctx = { params: Promise<{ code: string }> };

/** Consulta instantánea de un código escaneado (QR / barras). */
export async function GET(_request: NextRequest, ctx: Ctx) {
  const { code: raw } = await ctx.params;
  const code = extractCode(decodeURIComponent(raw));

  if (!code) {
    return NextResponse.json({ error: "Código vacío." }, { status: 400 });
  }

  const [row] = await db
    .select({ item: items, zone: zones })
    .from(items)
    .innerJoin(zones, eq(items.zoneId, zones.id))
    .where(eq(items.code, code));

  if (!row) {
    return NextResponse.json(
      { error: `Ningún artículo registrado con el código ${code}.` },
      { status: 404 },
    );
  }

  return NextResponse.json({ ...row.item, zone: row.zone });
}
