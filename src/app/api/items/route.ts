import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { items, movements, photos, zones } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getItems } from "@/lib/queries";
import { CATEGORIES, CONDITIONS, STATUSES } from "@/lib/constants";
import { zonePrefix } from "@/lib/utils";
import { apiAuthGuard } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Dinero en formato español: "1.200,50" | "1200.5" | number → número limpio. */
function parseMoneyValue(raw: unknown): { ok: boolean; value: number | null } {
  if (raw === null || raw === undefined || raw === "") return { ok: true, value: null };
  if (typeof raw === "number") {
    return Number.isFinite(raw) && raw >= 0 && raw <= 100_000_000
      ? { ok: true, value: raw }
      : { ok: false, value: null };
  }
  if (typeof raw === "string") {
    const clean = raw.trim().replace(/\s|€/g, "");
    if (!clean) return { ok: true, value: null };
    const num = clean.includes(",")
      ? Number(clean.replace(/\./g, "").replace(",", "."))
      : Number(clean);
    return Number.isFinite(num) && num >= 0 && num <= 100_000_000
      ? { ok: true, value: num }
      : { ok: false, value: null };
  }
  return { ok: false, value: null };
}

export async function GET(request: NextRequest) {
  const denied = await apiAuthGuard();
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
  const description = String(body.description ?? "").trim();
  const notes = String(body.notes ?? "").trim();
  const zoneId = Number(body.zoneId);
  const itemType = body.itemType === "CONTABLE" ? "CONTABLE" : "UNICO";
  if (!name) return { error: "El nombre del artículo es obligatorio." } as const;
  if (name.length > 160 || description.length > 2_000 || notes.length > 2_000)
    return { error: "Alguno de los textos supera la longitud permitida." } as const;
  if (!Number.isInteger(zoneId) || zoneId <= 0)
    return { error: "Debes indicar una zona válida." } as const;

  const rawQuantity = Number(body.quantity ?? 0);
  const rawMin = Number(body.minQuantity ?? 0);
  if (
    itemType === "CONTABLE" &&
    (!Number.isFinite(rawQuantity) || rawQuantity < 0 || rawQuantity > 1_000_000)
  ) {
    return { error: "La cantidad debe estar entre 0 y 1.000.000." } as const;
  }
  if (!Number.isFinite(rawMin) || rawMin < 0 || rawMin > 1_000_000) {
    return { error: "El stock mínimo debe estar entre 0 y 1.000.000." } as const;
  }

  const quantity = itemType === "UNICO" ? 1 : Math.floor(rawQuantity);
  const minQuantity = itemType === "UNICO" ? 0 : Math.floor(rawMin);

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

  const money = parseMoneyValue(body.estimatedValue);
  if (!money.ok) {
    return { error: "El valor estimado no es válido. Ejemplo: 1.200,50" } as const;
  }

  return {
    data: {
      name,
      description: description || null,
      category,
      zoneId,
      itemType,
      quantity,
      minQuantity,
      status,
      condition,
      acquisitionDate:
        typeof body.acquisitionDate === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(body.acquisitionDate)
          ? body.acquisitionDate
          : null,
      estimatedValue: money.value !== null ? money.value.toFixed(2) : null,
      notes: notes || null,
    },
  } as const;
}

export async function POST(request: NextRequest) {
  const denied = await apiAuthGuard();
  if (denied) return denied;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Datos de artículo no válidos." }, { status: 400 });
  }
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
