"use client";

import { secureFetch } from "@/lib/secure-fetch";

import { useRef, useState, type ChangeEvent } from "react";
import { Camera, ImagePlus, Loader2, RefreshCcw, Trash2 } from "lucide-react";
import { cn, photoUrl } from "@/lib/utils";

/**
 * Subida de fotografías con compresión en el navegador:
 * redimensiona a máx. 1600 px y codifica JPEG (~200–600 KB), por lo que
 * las fotos se guardan en PostgreSQL sin coste de ancho de banda y la
 * app queda lista para cualquier despliegue serverless.
 */
export function PhotoUploader({
  value,
  onChange,
  hint,
}: {
  value: number | null;
  onChange: (photoId: number | null) => void;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const url = photoUrl(value);

  async function loadBitmap(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; cleanup?: () => void }> {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { source: bmp, width: bmp.width, height: bmp.height, cleanup: () => bmp.close() };
    } catch {
      // Plan B: decodificar con <img> (formatos como HEIC en algunos equipos)
      const url = URL.createObjectURL(file);
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error("formato"));
        el.src = url;
      });
      return {
        source: img,
        width: img.naturalWidth,
        height: img.naturalHeight,
        cleanup: () => URL.revokeObjectURL(url),
      };
    }
  }

  async function compress(file: File): Promise<Blob> {
    const { source, width, height, cleanup } = await loadBitmap(file);
    try {
      const MAX = 1600;
      const scale = Math.min(1, MAX / Math.max(width, height));
      const w = Math.max(1, Math.round(width * scale));
      const h = Math.max(1, Math.round(height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas no disponible");
      ctx.drawImage(source, 0, 0, w, h);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.82),
      );
      if (!blob) throw new Error("No se pudo comprimir la imagen.");
      return blob;
    } finally {
      cleanup?.();
    }
  }

  async function handleFile(file: File) {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("El archivo debe ser una imagen (JPEG, PNG, WebP…).");
      return;
    }
    setPending(true);
    try {
      setProgress("Comprimiendo…");
      let blob: Blob;
      try {
        blob = await compress(file);
      } catch {
        setError(
          "El navegador no pudo procesar este formato. Prueba con una foto JPEG, PNG o WebP.",
        );
        return;
      }
      if (blob.size > 4 * 1024 * 1024) {
        setError("La imagen supera 4 MB incluso tras comprimirla. Prueba con otra foto.");
        return;
      }
      setProgress("Subiendo…");
      const fd = new FormData();
      fd.append("file", new File([blob], "foto.jpg", { type: "image/jpeg" }));
      const res = await secureFetch("/api/photos", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No se pudo subir la fotografía.");
        return;
      }
      onChange(data.id);
    } catch {
      setError("Error de conexión al subir la foto.");
    } finally {
      setPending(false);
      setProgress(null);
    }
  }

  function onInput(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    e.target.value = "";
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={onInput}
        className="hidden"
      />

      {url ? (
        <div className="group relative overflow-hidden rounded-2xl border border-line bg-paper-deep">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt="Fotografía actual"
            className="aspect-[16/10] w-full object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-end gap-1.5 bg-gradient-to-t from-ink/70 to-transparent p-2.5 pt-8 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={pending}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-cream text-ink shadow transition hover:bg-white disabled:opacity-50"
              aria-label="Cambiar fotografía"
              title="Cambiar fotografía"
            >
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => onChange(null)}
              disabled={pending}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-red-600 text-white shadow transition hover:bg-red-700 disabled:opacity-50"
              aria-label="Quitar fotografía"
              title="Quitar fotografía"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={pending}
          className={cn(
            "flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line bg-white/50 px-4 py-8 text-center transition",
            "hover:border-gold hover:bg-gold/5 disabled:cursor-wait disabled:opacity-60",
          )}
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gold/10 text-gold">
            {pending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ImagePlus className="h-5 w-5" strokeWidth={1.7} />
            )}
          </span>
          <span className="text-xs font-semibold text-ink">
            {pending ? progress ?? "Procesando…" : "Añadir fotografía"}
          </span>
          {!pending && (
            <span className="flex items-center gap-1.5 text-[0.68rem] text-ink-faint">
              <Camera className="h-3 w-3" />
              {hint ?? "Cámara o galería · se comprime automáticamente"}
            </span>
          )}
        </button>
      )}

      {error && (
        <p className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
