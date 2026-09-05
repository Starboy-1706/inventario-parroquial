import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { photos } from "@/db/schema";
import { apiAuthGuard } from "@/lib/auth";

export const dynamic = "force-dynamic";
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX_BYTES = 4 * 1024 * 1024;

function hasValidImageSignature(data: Buffer, mime: string) {
  if (data.length < 12) return false;
  if (mime === "image/jpeg") return data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  if (mime === "image/png")
    return data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mime === "image/webp")
    return data.toString("ascii", 0, 4) === "RIFF" && data.toString("ascii", 8, 12) === "WEBP";
  if (mime === "image/avif")
    return data.toString("ascii", 4, 8) === "ftyp" && data.toString("ascii", 8, 12).includes("avif");
  return false;
}

async function uploadToStorage(buffer: Buffer, mimeType: string) {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_PHOTO_BUCKET ?? "inventory-photos";
  if (!base || !key) return null;
  const ext = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  const path = `${new Date().getUTCFullYear()}/${crypto.randomUUID()}.${ext}`;
  const res = await fetch(`${base}/storage/v1/object/${bucket}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      apikey: key,
      "Content-Type": mimeType,
      "x-upsert": "false",
    },
    body: new Uint8Array(buffer),
  });
  if (!res.ok) {
    console.error("[photos/storage]", res.status, await res.text());
    return null; // fallback transparente a PostgreSQL
  }
  return `${bucket}/${path}`;
}

export async function POST(request: NextRequest) {
  const denied = await apiAuthGuard();
  if (denied) return denied;

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Selecciona una fotografía." }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json(
      { error: "Formato no admitido. Usa JPEG, PNG, WebP o AVIF." },
      { status: 415 },
    );
  }
  if (file.size === 0 || file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: file.size === 0 ? "El archivo está vacío." : "La imagen supera 4 MB." },
      { status: file.size === 0 ? 400 : 413 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!hasValidImageSignature(buffer, file.type)) {
    return NextResponse.json(
      { error: "El archivo no contiene una imagen válida." },
      { status: 415 },
    );
  }

  const storagePath = await uploadToStorage(buffer, file.type);
  const [row] = await db
    .insert(photos)
    .values({
      mimeType: file.type,
      size: buffer.length,
      storagePath,
      // Si Storage no está configurado/disponible se mantiene el fallback ACID.
      data: storagePath ? null : buffer,
    })
    .returning({ id: photos.id });

  return NextResponse.json(
    { id: row.id, url: `/api/photos/${row.id}`, storage: storagePath ? "supabase" : "postgres" },
    { status: 201 },
  );
}
