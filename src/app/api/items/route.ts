import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { items, movements, photos, zones } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getItems } from "@/lib/queries";
import { CATEGORIES, CONDITIONS, STATUSES } from "@/lib/constants";
import { zonePrefix } from "@/lib/utils";
import { apiIpGuard } from "@/lib/access";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = await apiIpGuard();
  if (denied) return denied;
  const sp = request.nextUrl.searchParams;
  const data = await getItems({
    zoneId: sp.get("zone") ? Number(sp.get("zone")) : undefined,
    type: sp.get("type") ?? undefined,
    status: sp.get("status") ?? undefined,
    search: sp.get("q") ?? undefined,
  });
  return NextResponse.json(data);
}

function parseItemBody(body: Record<string, unknown>) {
  const name = String(body.name ?? "").trim();
  const zoneId = Number(body.zoneId);
  const itemType = body.itemType === "CONTABLE" ? "CONTABLE" : "UNICO";
  if (!name) return { error: "El nombre del artículo es obligatorio." } as const;
  if (!Number.isInteger(zoneId) || zoneId <= 0)
    return { error: "Debes indicar una zona válida." } as const;

  const quantity =
    itemType === "UNICO"
      ? 1
      : Math.max(0, Math.floor(Number(body.quantity) || 0));
  const minQuantity = Math.max(0, Math.floor(Number(body.minQuantity) || 0));

  const status =
    typeof body.status === "string" &&
    (STATUSES as readonly string[]).includes(body.status)
      ? body.status
      : "DISPONIBLE";
  const condition =
    typeof body.condition === "string" &&
    (CONDITIONS as readonly string[]).includes(body.condition)
      ? body.condition
      : "BUENO";
  const category =
    typeof body.category === "string" && body.category.trim()
      ? body.category.trim()
      : (CATEGORIES[CATEGORIES.length - 1] as string);

  const value = Number(body.estimatedValue);

  return {
    data: {
      name,
      description: String(body.description ?? "").trim() || null,
      category,
      zoneId,
      itemType,
      quantity,
      minQuantity,
      status,
      condition,
      acquisitionDate:
        typeof body.acquisitionDate === "string" && body.acquisitionDate
          ? body.acquisitionDate
          : null,
      estimatedValue:
        Number.isFinite(value) && value >= 0 && body.estimatedValue !== "" &&
        body.estimatedValue !== null && body.estimatedValue !== undefined
          ? value.toFixed(2)
          : null,
      notes: String(body.notes ?? "").trim() || null,
    },
  } as const;
}

export async function POST(request: NextRequest) {
  const denied = await apiIpGuard();
  if (denied) return denied;
  const body = await request.json();
  const parsed = parseItemBody(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const [zone] = await db.select().from(zones).where(eq(zones.id, parsed.data.zoneId));
  if (!zone) {
    return NextResponse.json({ error: "La zona indicada no existe." }, { status: 400 });
  }

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

  // Código único en transacción ACID: alta → código definitivo → movimiento ALTA
  const created = await db.transaction(async (tx) => {
    const tempCode = `TMP-${crypto.randomUUID()}`;
    const [inserted] = await tx
      .insert(items)
      .values({ ...parsed.data, photoId, code: tempCode })
      .returning();

    const code = `${zonePrefix(zone.name)}-${String(inserted.id).padStart(4, "0")}`;
    const [finalItem] = await tx
      .update(items)
      .set({ code })
      .where(eq(items.id, inserted.id))
      .returning();

    await tx.insert(movements).values({
      itemId: inserted.id,
      type: "ALTA",
      quantity: inserted.quantity,
      note: `Alta en el inventario · Zona: ${zone.name}`,
    });

    return finalItem;
  });

  return NextResponse.json(created, { status: 201 });
}
