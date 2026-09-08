import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  appSettings,
  categories,
  itemPhotos,
  items,
  movements,
  photos,
  storageLocations,
  zones,
} from "@/db/schema";
import { apiAuthGuard } from "@/lib/auth";
import { getItemsPage } from "@/lib/queries";
import { itemCreateSchema, zodErrorMessage } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = await apiAuthGuard();
  if (denied) return denied;
  const sp = request.nextUrl.searchParams;
  const zoneValue = Number(sp.get("zone"));
  const result = await getItemsPage({
    zoneId: Number.isInteger(zoneValue) && zoneValue > 0 ? zoneValue : undefined,
    type: sp.get("type") ?? undefined,
    status: sp.get("status") ?? undefined,
    search: sp.get("q")?.slice(0, 160) ?? undefined,
    deleted: sp.get("deleted") === "1",
    page: Number(sp.get("page")) || 1,
    pageSize: Number(sp.get("pageSize")) || 25,
  });
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}

function pgCode(error: unknown, code: string) {
  let current: unknown = error;
  for (let i = 0; i < 6 && current; i++) {
    if (typeof current !== "object") break;
    const e = current as { code?: string; cause?: unknown };
    if (e.code === code) return true;
    current = e.cause;
  }
  return false;
}

export async function POST(request: NextRequest) {
  const denied = await apiAuthGuard();
  if (denied) return denied;

  const json = await request.json().catch(() => null);
  const parsed = itemCreateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: zodErrorMessage(parsed.error) }, { status: 400 });
  }
  const data = parsed.data;

  const [[zone], [category], [settings]] = await Promise.all([
    db.select({ id: zones.id, name: zones.name }).from(zones).where(eq(zones.id, data.zoneId)),
    db.select({ name: categories.name }).from(categories).where(and(eq(categories.name, data.category), eq(categories.active, true))),
    db.select().from(appSettings).where(eq(appSettings.id, 1)),
  ]);
  if (!zone) return NextResponse.json({ error: "La zona indicada no existe." }, { status: 400 });
  if (!category) return NextResponse.json({ error: "La categoría indicada no está activa." }, { status: 400 });

  if (data.locationId) {
    const [location] = await db
      .select({ id: storageLocations.id })
      .from(storageLocations)
      .where(and(eq(storageLocations.id, data.locationId), eq(storageLocations.zoneId, data.zoneId)));
    if (!location) {
      return NextResponse.json({ error: "La ubicación detallada no pertenece a esa zona." }, { status: 400 });
    }
  }

  const allPhotoIds = [...new Set([data.photoId, ...data.photoIds].filter((v): v is number => Boolean(v)))];
  if (allPhotoIds.length) {
    const existing = await db.select({ id: photos.id }).from(photos).where(inArray(photos.id, allPhotoIds));
    if (existing.length !== allPhotoIds.length) {
      return NextResponse.json({ error: "Alguna fotografía ya no existe." }, { status: 400 });
    }
  }

  try {
    const created = await db.transaction(async (tx) => {
      // Auto-corrección de secuencia: evita colisiones cuando hubo borrados
      // o transacciones abortadas (las secuencias no revierten las asignaciones).
      await tx.execute(sql`
        SELECT setval(
          'inventory_code_seq',
          GREATEST(
            (SELECT COALESCE(MAX(inventory_number), 0) FROM items),
            (SELECT last_value FROM inventory_code_seq),
            1
          )
        )
      `);
      const seq = await tx.execute(sql`select nextval('inventory_code_seq')::int as n`);
      const inventoryNumber = Number(seq.rows[0]?.n);
      if (!Number.isInteger(inventoryNumber)) throw new Error("SEQUENCE_ERROR");
      const prefix = (settings?.inventoryPrefix || "PSB").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) || "PSB";
      const code = `${prefix}-${String(inventoryNumber).padStart(6, "0")}`;

      const [item] = await tx
        .insert(items)
        .values({
          inventoryNumber,
          code,
          externalBarcode: data.externalBarcode,
          name: data.name,
          description: data.description,
          category: data.category,
          zoneId: data.zoneId,
          locationId: data.locationId,
          locationNote: data.locationNote,
          photoId: data.photoId ?? allPhotoIds[0] ?? null,
          itemType: data.itemType,
          quantity: data.quantity,
          minQuantity: data.minQuantity,
          status: data.status,
          condition: data.condition,
          acquisitionDate: data.acquisitionDate,
          estimatedValue:
            data.estimatedValue !== null ? data.estimatedValue.toFixed(2) : null,
          notes: data.notes,
        })
        .returning();

      if (allPhotoIds.length) {
        await tx.insert(itemPhotos).values(
          allPhotoIds.map((photoId, index) => ({
            itemId: item.id,
            photoId,
            isPrimary: index === 0,
            sortOrder: index,
          })),
        );
      }
      await tx.insert(movements).values({
        itemId: item.id,
        type: "ALTA",
        quantity: item.quantity,
        note: `Alta en inventario · ${zone.name} · Código permanente ${code}`,
      });
      return item;
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (pgCode(error, "23505")) {
      return NextResponse.json(
        {
          error:
            "El código de barras comercial o un identificador interno ya existía. " +
            "Inténtalo de nuevo: si se trató de una colisión de numeración, ya quedó corregida.",
        },
        { status: 409 },
      );
    }
    console.error("[items/create]", error);
    return NextResponse.json(
      { error: "No se pudo completar el alta. Inténtalo de nuevo en unos segundos." },
      { status: 500 },
    );
  }
}
