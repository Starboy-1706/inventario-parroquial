import { NextRequest } from "next/server";
import { db } from "@/db";
import { photos } from "@/db/schema";
import { eq } from "drizzle-orm";
import { apiAuthGuard } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

/** Sirve una fotografía almacenada en PostgreSQL, con caché inmutable. */
export async function GET(_request: NextRequest, ctx: Ctx) {
  const denied = await apiAuthGuard();
  if (denied) return denied;
  const { id: raw } = await ctx.params;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    return new Response("Foto no válida.", { status: 400 });
  }

  const [row] = await db
    .select({ mimeType: photos.mimeType, data: photos.data })
    .from(photos)
    .where(eq(photos.id, id));

  if (!row) {
    return new Response("Foto no encontrada.", { status: 404 });
  }

  const body = new Blob([row.data as unknown as BlobPart], {
    type: row.mimeType,
  });

  return new Response(body, {
    headers: {
      "Content-Type": row.mimeType,
      "Content-Length": String(row.data.length),
      // Recurso privado: nunca debe quedar visible en caché tras cerrar sesión.
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}
