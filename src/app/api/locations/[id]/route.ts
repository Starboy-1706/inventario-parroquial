import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { items, storageLocations } from "@/db/schema";
import { apiAuthGuard } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };
export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const denied = await apiAuthGuard(); if (denied) return denied;
  const { id: raw } = await ctx.params; const id = Number(raw);
  const [count] = await db.select({ n: sql<number>`count(*)::int` }).from(items).where(eq(items.locationId, id));
  if (count.n) return NextResponse.json({ error: "La ubicación contiene artículos." }, { status: 409 });
  const [row] = await db.delete(storageLocations).where(eq(storageLocations.id, id)).returning();
  return row ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "No encontrada." }, { status: 404 });
}
