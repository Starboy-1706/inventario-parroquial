"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Loader2,
  MapPinPlus,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import type { Zone } from "@/db/schema";
import { ZONE_COLORS, ZONE_ICONS } from "@/lib/constants";
import { Button, Field, inputCls } from "@/components/ui";
import { ZoneIcon } from "@/components/ui";
import { PhotoUploader } from "@/components/photo-uploader";
import { secureFetch } from "@/lib/secure-fetch";
import { cn } from "@/lib/utils";

export function ZoneCreateForm({ existingZones }: { existingZones: Zone[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<string>(ZONE_COLORS[0]);
  const [icon, setIcon] = useState<string>("church");
  const [photoId, setPhotoId] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Zone | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Escribe el nombre de la zona (ej. Sacristía, Despacho Parroquial).");
      return;
    }
    if (existingZones.some((z) => z.name.toLowerCase() === trimmedName.toLowerCase())) {
      setError("Ya existe una zona con ese nombre.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await secureFetch("/api/zones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, description: description.trim(), color, icon, photoId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo crear la zona.");
        return;
      }
      setCreated(data);
      router.refresh();
    } catch {
      setError("Error de conexión. Inténtalo de nuevo.");
    } finally {
      setPending(false);
    }
  }

  /* ---------- Pantalla de éxito ---------- */
  if (created) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-12 sm:px-8">
        <div className="animate-fade-up rounded-3xl border border-emerald-200 bg-emerald-50/60 p-8 text-center shadow-card sm:p-10">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <Sparkles className="h-7 w-7" />
          </span>
          <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-ink">
            ¡Zona creada!
          </h1>
          <div className="mt-4 flex items-center justify-center gap-3">
            <ZoneIcon icon={created.icon} color={created.color} size="lg" />
            <span className="font-display text-2xl font-semibold text-ink">{created.name}</span>
          </div>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-soft">
            Ya puedes dar de alta artículos en esta estancia y asignarles su
            código permanente PSB.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-2.5">
            <Button variant="dark" onClick={() => router.push(`/inventario/nuevo?zona=${created.id}`)}>
              <MapPinPlus className="h-4 w-4" />
              Añadir artículo en esta zona
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setName("");
                setDescription("");
                setColor(ZONE_COLORS[0]);
                setIcon("church");
                setPhotoId(null);
                setCreated(null);
                setError(null);
              }}
            >
              Crear otra zona
            </Button>
            <Button variant="outline" onClick={() => router.push("/zonas")}>
              Ver todas las zonas
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- Formulario ---------- */
  return (
    <div className="mx-auto max-w-3xl px-4 py-5 sm:px-8 lg:py-12 pb-32 sm:pb-12">
      <Link
        href="/zonas"
        className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft transition hover:text-ink active:scale-95"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver a zonas
      </Link>

      <header className="mt-4 animate-fade-up">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-gold">
          Parroquia Santa Bárbara
        </p>
        <h1 className="mt-1.5 font-display text-2xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-ink">
          Nueva zona
        </h1>
        <p className="mt-1.5 max-w-xl text-xs sm:text-sm leading-relaxed text-ink-soft">
          Crea una estancia o ubicación física de la parroquia para clasificar
          su contenido (ej. Sacristía, Despacho, Salón Parroquial…).
        </p>
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
                autoFocus
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Sacristía, Despacho, Salón Parroquial…"
                className={inputCls}
              />
            </Field>
            <Field label="Descripción" hint="Qué se guarda o realiza en esta estancia">
              <textarea
                rows={2}
                maxLength={500}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej. Vasos sagrados, ornamentos y objetos de culto"
                className={cn(inputCls, "resize-none")}
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

          {/* Vista previa en vivo */}
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
          <p className="mt-1 text-xs text-ink-soft">
            Una vista del espacio ayuda a reconocerlo al inventariar.
          </p>
          <div className="mt-4">
            <PhotoUploader value={photoId} onChange={setPhotoId} />
          </div>
        </section>

        {/* Barra de acción móvil */}
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
          <Button type="submit" variant="dark" disabled={pending} className="flex-1 sm:flex-initial py-3 sm:py-2.5 shadow-lift">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 text-gold-soft" />}
            {pending ? "Creando…" : "Crear zona"}
          </Button>
        </div>
      </form>
    </div>
  );
}
