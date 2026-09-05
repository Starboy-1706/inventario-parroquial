import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { items, zones } from "@/db/schema";
import { extractCode } from "@/lib/utils";
import { apiAuthGuard } from "@/lib/auth";

type Ctx = { params: Promise<{ code: string }> };

export async function GET(_request: NextRequest, ctx: Ctx) {
  const denied = await apiAuthGuard();
  if (denied) return denied;
  const { code: raw } = await ctx.params;
  const code = extractCode(decodeURIComponent(raw)).slice(0, 160);
  if (!code) return NextResponse.json({ error: "Código vacío." }, { status: 400 });

  const [row] = await db
    .select({ item: items, zone: zones })
    .from(items)
    .innerJoin(zones, eq(items.zoneId, zones.id))
    .where(
      and(
        isNull(items.deletedAt),
        or(
          eq(items.code, code),
          eq(items.externalBarcode, code),
          sql`exists (select 1 from item_code_aliases a where a.item_id = ${items.id} and upper(a.code) = upper(${code}))`,
        ),
      ),
    )
    .limit(1);
  if (!row) {
    return NextResponse.json(
      { error: `Ningún artículo registrado con el código ${code}.` },
      { status: 404 },
    );
  }
  return NextResponse.json({ ...row.item, zone: row.zone });
}
