import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { photos } from "@/db/schema";

export const dynamic = "force-dynamic";

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX_BYTES = 4 * 1024 * 1024; // 4 MB (el cliente comprime antes de subir)

/**
 * Sube una fotografía (multipart/form-data, campo "file").
 * La imagen se guarda en PostgreSQL → persistencia total en cualquier
 * despliegue cloud (el sistema de archivos de Vercel es efímero).
 */
export async function POST(request: NextRequest) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "La petición debe ser multipart/form-data." },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "No se recibió ningún archivo (campo “file”)." },
      { status: 400 },
    );
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json(
      { error: "Formato no admitido. Usa JPEG, PNG, WebP o AVIF." },
      { status: 415 },
    );
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "El archivo está vacío." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "La imagen supera el máximo de 4 MB. Haz la foto de nuevo o reduce su tamaño." },
      { status: 413 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const [row] = await db
    .insert(photos)
    .values({ mimeType: file.type, size: buffer.length, data: buffer })
    .returning({ id: photos.id });

  return NextResponse.json(
    { id: row.id, url: `/api/photos/${row.id}` },
    { status: 201 },
  );
}
