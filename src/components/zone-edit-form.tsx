"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Ruler, Save, TriangleAlert } from "lucide-react";
import type { Zone } from "@/db/schema";
import { ZONE_COLORS, ZONE_ICONS } from "@/lib/constants";
import { Button, Field, inputCls, ZoneIcon } from "@/components/ui";
import { PhotoUploader } from "@/components/photo-uploader";
import { secureFetch } from "@/lib/secure-fetch";
import { cn } from "@/lib/utils";

/** Edición de zona a página completa (sin ventanas flotantes). */
export function ZoneEditForm({ zone }: { zone: Zone }) {
  const router = useRouter();
  const [name, setName] = useState(zone.name);
  const [description, setDescription] = useState(zone.description ?? "");
  const [color, setColor] = useState<string>(zone.color);
  const [icon, setIcon] = useState<string>(zone.icon);
  const [photoId, setPhotoId] = useState<number | null>(zone.photoId);
  const [dimLength, setDimLength] = useState(zone.dimLengthM ?? "");
  const [dimWidth, setDimWidth] = useState(zone.dimWidthM ?? "");
  const [dimHeight, setDimHeight] = useState(zone.dimHeightM ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Escribe el nombre de la zona.");
      return;
    }
    const parseDimM = (raw: string): { ok: boolean; value: number | null } => {
      const t = raw.trim();
      if (!t) return { ok: true, value: null };
      const n = Number(t.replace(/\s|m/gi, "").replace(",", "."));
      if (!Number.isFinite(n) || n < 0 || n > 999.99) return { ok: false, value: null };
      return { ok: true, value: Math.round(n * 100) / 100 };
    };
    const len = parseDimM(dimLength);
    const wid = parseDimM(dimWidth);
    const hei = parseDimM(dimHeight);
    if (!len.ok || !wid.ok || !hei.ok) {
      setError("Las medidas del área deben ser números entre 0 y 999,99 metros (ej. 12,5).");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await secureFetch(`/api/zones/${zone.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          description: description.trim(),
          color,
          icon,
          photoId,
          dimLengthM: len.value,
          dimWidthM: wid.value,
          dimHeightM: hei.value,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No se pudo guardar la zona.");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      router.refresh();
      router.push("/zonas");
    } catch {
      setError("Error de conexión. Inténtalo de nuevo.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-5 pb-32 sm:px-8 sm:pb-12 lg:py-12">
      <Link
        href="/zonas"
        className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft transition hover:text-ink active:scale-95"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver a zonas
      </Link>

      <header className="mt-4 animate-fade-up">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-gold">
          Ubicación física de la parroquia
        </p>
        <h1 className="mt-1.5 font-display text-2xl font-semibold tracking-tight text-ink sm:text-4xl lg:text-5xl">
          Editar {zone.name}
        </h1>
      </header>

      {error && (
        <p
          role="alert"
          className="mt-6 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
        >
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      <form
        onSubmit={handleSubmit}
        noValidate
        className="mt-8 animate-fade-up space-y-5"
        style={{ animationDelay: "120ms" }}
      >
        {/* ---------- Datos principales ---------- */}
        <section className="rounded-3xl border border-line bg-cream p-5 shadow-card sm:p-6">
          <h2 className="text-[0.66rem] font-bold uppercase tracking-[0.2em] text-gold-deep">
            Datos principales
          </h2>
          <div className="mt-4 grid gap-4">
            <Field label="Nombre de la zona">
              <input
                required
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Sacristía, Despacho, Salón Parroquial…"
                className={inputCls}
              />
            </Field>
            <Field
              label="Descripción"
              hint={`Sin límite de caracteres${description.length ? ` · ${description.length.toLocaleString("es-ES")} escritos` : ""}`}
            >
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Qué se guarda aquí, historia, detalles de la estancia…"
                className={cn(inputCls, "resize-y")}
              />
            </Field>
          </div>
        </section>

        {/* ---------- Medidas del área ---------- */}
        <section className="rounded-3xl border border-line bg-cream p-5 shadow-card sm:p-6">
          <h2 className="flex items-center gap-2 text-[0.66rem] font-bold uppercase tracking-[0.2em] text-gold-deep">
            <Ruler className="h-3.5 w-3.5" />
            Medidas del área (metros)
          </h2>
          <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">
            Largo × ancho (× alto) de la estancia. Con largo y ancho se calcula
            automáticamente la superficie en m².
          </p>
          <div className="mt-4 grid grid-cols-3 gap-3 sm:gap-4">
            <Field label="Largo (m)">
              <input
                inputMode="decimal"
                value={dimLength}
                onChange={(e) => setDimLength(e.target.value)}
                placeholder="12"
                className={cn(inputCls, "text-center font-mono")}
              />
            </Field>
            <Field label="Ancho (m)">
              <input
                inputMode="decimal"
                value={dimWidth}
                onChange={(e) => setDimWidth(e.target.value)}
                placeholder="8"
                className={cn(inputCls, "text-center font-mono")}
              />
            </Field>
            <Field label="Alto (m)">
              <input
                inputMode="decimal"
                value={dimHeight}
                onChange={(e) => setDimHeight(e.target.value)}
                placeholder="3,5"
                className={cn(inputCls, "text-center font-mono")}
              />
            </Field>
          </div>
        </section>

        {/* ---------- Apariencia ---------- */}
        <section className="rounded-3xl border border-line bg-cream p-5 shadow-card sm:p-6">
          <h2 className="text-[0.66rem] font-bold uppercase tracking-[0.2em] text-gold-deep">
            Apariencia en la aplicación
          </h2>

          <div className="mt-4">
            <Field label="Color distintivo">
              <div className="flex flex-wrap gap-2.5">
                {ZONE_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={cn(
                      "h-10 w-10 cursor-pointer rounded-full border-2 transition-transform hover:scale-110",
                      color === c ? "border-ink scale-110 ring-2 ring-offset-2 ring-gold/40" : "border-transparent",
                    )}
                    style={{ backgroundColor: c }}
                    aria-label={`Color ${c}`}
                  />
                ))}
              </div>
            </Field>
          </div>

          <div className="mt-4">
            <Field label="Icono representativo">
              <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
                {ZONE_ICONS.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setIcon(ic)}
                    className={cn(
                      "flex h-11 cursor-pointer items-center justify-center rounded-xl border-2 transition",
                      icon === ic ? "border-gold bg-gold/10" : "border-line bg-white/60 hover:border-ink/25",
                    )}
                  >
                    <ZoneIcon icon={ic} color={icon === ic ? color : "#a3987f"} size="sm" />
                  </button>
                ))}
              </div>
            </Field>
          </div>

          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-line bg-white/60 p-3">
            <ZoneIcon icon={icon} color={color} size="lg" />
            <div>
              <p className="text-sm font-bold text-ink">{name || "Vista previa"}</p>
              <p className="text-xs text-ink-soft">{description || "Descripción de la zona…"}</p>
            </div>
            <span className="ml-auto h-6 w-6 rounded-full border-2" style={{ backgroundColor: color }} />
          </div>
        </section>

        {/* ---------- Fotografía ---------- */}
        <section className="rounded-3xl border border-line bg-cream p-5 shadow-card sm:p-6">
          <h2 className="text-[0.66rem] font-bold uppercase tracking-[0.2em] text-gold-deep">
            Fotografía de la estancia
          </h2>
          <div className="mt-4">
            <PhotoUploader value={photoId} onChange={setPhotoId} />
          </div>
        </section>

        {/* Barra de acción */}
        <div
          className="fixed inset-x-0 z-[45] flex items-center justify-between gap-3 border-t border-line bg-cream/95 px-4 py-3 shadow-[0_-8px_24px_rgba(33,28,18,.10)] backdrop-blur-xl sm:static sm:z-auto sm:border-t sm:border-line-soft sm:bg-transparent sm:p-0 sm:pt-4 sm:shadow-none"
          style={{ bottom: "calc(4.35rem + env(safe-area-inset-bottom))" }}
        >
          <Link
            href="/zonas"
            className="inline-flex items-center justify-center rounded-full border border-line bg-white px-5 py-3 text-xs font-semibold text-ink-soft transition hover:bg-ink/5 hover:text-ink sm:border-0 sm:bg-transparent sm:py-2.5 sm:text-sm"
          >
            Cancelar
          </Link>
          <Button type="submit" variant="dark" disabled={pending} className="flex-1 py-3 shadow-lift sm:flex-initial sm:py-2.5">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 text-gold-soft" />}
            {pending ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      </form>
    </div>
  );
}
