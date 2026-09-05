import { NextRequest, NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { apiAuthGuard } from "@/lib/auth";

export async function GET() { const denied = await apiAuthGuard(); if (denied) return denied; return NextResponse.json(await db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.name))); }
export async function POST(request: NextRequest) {
  const denied = await apiAuthGuard(); if (denied) return denied;
  const body = await request.json().catch(() => null); const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 120) return NextResponse.json({ error: "Nombre de categoría no válido." }, { status: 400 });
  try { const [row] = await db.insert(categories).values({ name, description: String(body.description ?? "").trim().slice(0, 500) || null }).returning(); return NextResponse.json(row, { status: 201 }); }
  catch { return NextResponse.json({ error: "Ya existe esa categoría." }, { status: 409 }); }
}
export async function PATCH(request: NextRequest) {
  const denied = await apiAuthGuard(); if (denied) return denied;
  const body = await request.json().catch(() => null); const id = Number(body?.id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Categoría no válida." }, { status: 400 });
  const [row] = await db.update(categories).set({ active: Boolean(body.active) }).where(eq(categories.id, id)).returning();
  return row ? NextResponse.json(row) : NextResponse.json({ error: "No encontrada." }, { status: 404 });
}
