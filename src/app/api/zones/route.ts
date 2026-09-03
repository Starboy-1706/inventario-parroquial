import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { photos, zones } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getZonesWithCounts } from "@/lib/queries";
import { slugify } from "@/lib/utils";
import { ZONE_COLORS, ZONE_ICONS } from "@/lib/constants";
import { apiIpGuard } from "@/lib/access";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await apiIpGuard();
  if (denied) return denied;
  const data = await getZonesWithCounts();
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const denied = await apiIpGuard();
  if (denied) return denied;
  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    if (!name) {
      return NextResponse.json(
        { error: "El nombre de la zona es obligatorio." },
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
      const [photo] = await db.select({ id: photos.id }).from(photos).where(eq(photos.id, pid));
      if (!photo) {
        return NextResponse.json({ error: "La fotografía indicada no existe." }, { status: 400 });
      }
      photoId = pid;
    }

    const [created] = await db
      .insert(zones)
      .values({
        name,
        slug,
        description: String(body.description ?? "").trim() || null,
        color,
        icon,
        photoId,
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error: unknown) {
    const message =
      error instanceof Error && error.message.includes("unique")
        ? "Ya existe una zona con ese nombre."
        : "No se pudo crear la zona.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
