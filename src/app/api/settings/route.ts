import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appSettings } from "@/db/schema";
import { apiAuthGuard } from "@/lib/auth";

export async function GET() {
  const denied = await apiAuthGuard(); if (denied) return denied;
  const [row] = await db.select().from(appSettings).where(eq(appSettings.id, 1));
  return NextResponse.json(row);
}
export async function PATCH(request: NextRequest) {
  const denied = await apiAuthGuard(); if (denied) return denied;
  const body = await request.json().catch(() => null);
  const parishName = typeof body?.parishName === "string" ? body.parishName.trim() : "";
  const prefix = typeof body?.inventoryPrefix === "string" ? body.inventoryPrefix.trim().toUpperCase().replace(/[^A-Z0-9]/g, "") : "";
  if (!parishName || parishName.length > 120 || prefix.length < 2 || prefix.length > 6) {
    return NextResponse.json({ error: "Nombre o prefijo no válidos." }, { status: 400 });
  }
  const [row] = await db.update(appSettings).set({ parishName, inventoryPrefix: prefix, address: String(body.address ?? "").trim().slice(0, 300) || null, labelFooter: String(body.labelFooter ?? "").trim().slice(0, 300) || null, updatedAt: new Date() }).where(eq(appSettings.id, 1)).returning();
  return NextResponse.json(row);
}
