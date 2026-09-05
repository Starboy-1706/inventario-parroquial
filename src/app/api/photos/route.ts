import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { photos } from "@/db/schema";
import { apiAuthGuard } from "@/lib/auth";

export const dynamic = "force-dynamic";

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX_BYTES = 4 * 1024 * 1024; // 4 MB (el cliente comprime antes de subir)

function hasValidImageSignature(data: Buffer, mime: string) {
  if (data.length < 12) return false;
  if (mime === "image/jpeg") {
    return data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  }
  if (mime === "image/png") {
    return data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }
  if (mime === "image/webp") {
    return data.toString("ascii", 0, 4) === "RIFF" && data.toString("ascii", 8, 12) === "WEBP";
  }
  if (mime === "image/avif") {
    return data.toString("ascii", 4, 8) === "ftyp" && data.toString("ascii", 8, 12).includes("avif");
  }
  return false;
}

/**
 * Sube una fotografía (multipart/form-data, campo "file").
 * La imagen se guarda en PostgreSQL → persistencia total en cualquier
 * despliegue cloud (el sistema de archivos de Vercel es efímero).
 */
export async function POST(request: NextRequest) {
  const denied = await apiAuthGuard();
  if (denied) return denied;
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
  if (!hasValidImageSignature(buffer, file.type)) {
    return NextResponse.json(
      { error: "El contenido del archivo no corresponde a una imagen válida." },
      { status: 415 },
    );
  }

  const [row] = await db
    .insert(photos)
    .values({ mimeType: file.type, size: buffer.length, data: buffer })
    .returning({ id: photos.id });

  return NextResponse.json(
    { id: row.id, url: `/api/photos/${row.id}` },
    { status: 201 },
  );
}
