import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { photos, zones } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getZonesWithCounts } from "@/lib/queries";
import { slugify } from "@/lib/utils";
import { ZONE_COLORS, ZONE_ICONS } from "@/lib/constants";
import { apiAuthGuard } from "@/lib/auth";

export const dynamic = "force-dynamic";

function hasPgCode(error: unknown, code: string) {
  let current: unknown = error;
  for (let depth = 0; depth < 6 && current; depth++) {
    if (typeof current !== "object") return false;
    const value = current as { code?: string; cause?: unknown };
    if (value.code === code) return true;
    current = value.cause;
  }
  return false;
}

export async function GET() {
  const denied = await apiAuthGuard();
  if (denied) return denied;
  const data = await getZonesWithCounts();
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const denied = await apiAuthGuard();
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Datos de zona no válidos." }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  const description = String(body.description ?? "").trim();
  if (!name) {
    return NextResponse.json(
      { error: "El nombre de la zona es obligatorio." },
      { status: 400 },
    );
  }
  if (name.length > 100 || description.length > 500) {
    return NextResponse.json(
      { error: "El nombre o la descripción son demasiado largos." },
      { status: 400 },
    );
  }

  const slug = slugify(name);
  const color =
    typeof body.color === "string" && /^#[0-9A-Fa-f]{6}$/.test(body.color)
      ? body.color
      : ZONE_COLORS[0];
  const icon = ZONE_ICONS.includes(body.icon) ? body.icon : "church";

  let photoId: number | null = null;
  if (body.photoId !== undefined && body.photoId !== null) {
    const pid = Number(body.photoId);
    if (!Number.isInteger(pid) || pid <= 0) {
      return NextResponse.json({ error: "Foto no válida." }, { status: 400 });
    }
    const [photo] = await db
      .select({ id: photos.id })
      .from(photos)
      .where(eq(photos.id, pid));
    if (!photo) {
      return NextResponse.json(
        { error: "La fotografía indicada no existe." },
        { status: 400 },
      );
    }
    photoId = pid;
  }

  try {
    const [created] = await db
      .insert(zones)
      .values({ name, slug, description: description || null, color, icon, photoId })
      .returning();
    return NextResponse.json(created, { status: 201 });
  } catch (error: unknown) {
    const duplicate = hasPgCode(error, "23505");
    return NextResponse.json(
      {
        error: duplicate
          ? "Ya existe una zona con ese nombre."
          : "No se pudo crear la zona.",
      },
      { status: duplicate ? 409 : 500 },
    );
  }
}
