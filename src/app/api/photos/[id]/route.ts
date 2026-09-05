import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { itemPhotos, items, photos, zones } from "@/db/schema";
import { eq, or, sql } from "drizzle-orm";
import { apiAuthGuard } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

async function fetchStorage(path: string) {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) return null;
  const slash = path.indexOf("/");
  if (slash < 1) return null;
  const bucket = path.slice(0, slash);
  const object = path.slice(slash + 1);
  const res = await fetch(`${base}/storage/v1/object/${bucket}/${object}`, {
    headers: { Authorization: `Bearer ${key}`, apikey: key },
    cache: "no-store",
  });
  return res.ok ? Buffer.from(await res.arrayBuffer()) : null;
}

export async function GET(_request: NextRequest, ctx: Ctx) {
  const denied = await apiAuthGuard();
  if (denied) return denied;
  const { id: raw } = await ctx.params;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) return new Response("Foto no válida.", { status: 400 });

  const [row] = await db
    .select({ mimeType: photos.mimeType, data: photos.data, thumbnail: photos.thumbnailData, storagePath: photos.storagePath })
    .from(photos)
    .where(eq(photos.id, id));
  if (!row) return new Response("Foto no encontrada.", { status: 404 });

  const useThumb = _request.nextUrl.searchParams.get("thumb") === "1";
  const buffer = (useThumb ? row.thumbnail : null) ?? row.data ??
    (row.storagePath ? await fetchStorage(row.storagePath) : null);
  if (!buffer) return new Response("Imagen temporalmente no disponible.", { status: 503 });

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": row.mimeType,
      "Content-Length": String(buffer.length),
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}

/** Elimina solo fotos huérfanas; nunca rompe una ficha por accidente. */
export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const denied = await apiAuthGuard();
  if (denied) return denied;
  const { id: raw } = await ctx.params;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Foto no válida." }, { status: 400 });
  }
  const [refs] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(photos)
    .leftJoin(items, eq(items.photoId, photos.id))
    .leftJoin(zones, eq(zones.photoId, photos.id))
    .leftJoin(itemPhotos, eq(itemPhotos.photoId, photos.id))
    .where(andPhoto(id));
  if (refs.n > 1) {
    return NextResponse.json({ error: "La foto todavía está asociada a un registro." }, { status: 409 });
  }
  await db.delete(photos).where(eq(photos.id, id));
  return NextResponse.json({ ok: true });
}

function andPhoto(id: number) {
  return or(
    eq(photos.id, id),
    // La condición base garantiza una fila incluso sin referencias.
    sql`${photos.id} = ${id}`,
  );
}
