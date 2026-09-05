"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Boxes,
  Check,
  Church,
  Loader2,
  PackagePlus,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import {
  CATEGORIES,
  CONDITIONS,
  CONDITION_LABELS,
  STATUSES,
  STATUS_LABELS,
} from "@/lib/constants";
import type { Category, StorageLocation, Zone } from "@/db/schema";
import { Button, Field, inputCls } from "@/components/ui";
import { PhotoGalleryUploader } from "@/components/photo-gallery-uploader";
import { secureFetch } from "@/lib/secure-fetch";
import { cn } from "@/lib/utils";

type FieldErrors = Record<string, string>;

/** Dinero en formato español: acepta "1.200,50", "1200.50" o "1200". */
function parseMoneyInput(raw: string): { ok: boolean; value: number | null } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, value: null };
  const clean = trimmed.replace(/\s|€/g, "");
  const num = clean.includes(",")
    ? Number(clean.replace(/\./g, "").replace(",", "."))
    : Number(clean);
  if (!Number.isFinite(num) || num < 0 || num > 100_000_000) {
    return { ok: false, value: null };
  }
  return { ok: true, value: num };
}

export function ItemCreateForm({
  zones,
  categories,
  locations,
  defaultZoneId,
}: {
  zones: Zone[];
  categories: Category[];
  locations: StorageLocation[];
  defaultZoneId?: number;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [itemType, setItemType] = useState<string>("UNICO");
  const [photoIds, setPhotoIds] = useState<number[]>([]);
  const [money, setMoney] = useState("");
  const [selectedZoneId, setSelectedZoneId] = useState(defaultZoneId ?? zones[0]?.id ?? 0);
  const [created, setCreated] = useState<{ id: number; code: string } | null>(null);

  function resetForAnother() {
    setItemType("UNICO");
    setPhotoIds([]);
    setMoney("");
    setSelectedZoneId(defaultZoneId ?? zones[0]?.id ?? 0);
    setErrors({});
    setServerError(null);
    setCreated(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const nextErrors: FieldErrors = {};

    const name = String(fd.get("name") ?? "").trim();
    if (!name) nextErrors.name = "Escribe el nombre del artículo.";
    const zoneId = Number(fd.get("zoneId"));
    if (!Number.isInteger(zoneId) || zoneId <= 0) nextErrors.zoneId = "Elige una zona.";

    let quantity = 1;
    let minQuantity = 0;
    if (itemType === "CONTABLE") {
      const q = String(fd.get("quantity") ?? "").trim();
      const qn = q === "" ? 0 : Number(q);
      if (!Number.isInteger(qn) || qn < 0) nextErrors.quantity = "Cantidad válida: 0 o más.";
      else quantity = qn;
      const m = String(fd.get("minQuantity") ?? "").trim();
      const mn = m === "" ? 0 : Number(m);
      if (!Number.isInteger(mn) || mn < 0) nextErrors.minQuantity = "Mínimo válido: 0 o más.";
      else minQuantity = mn;
    }

    const parsedMoney = parseMoneyInput(money);
    if (!parsedMoney.ok) nextErrors.money = "Formato no válido. Ejemplo: 1.200,50";

    const acquisitionDate = String(fd.get("acquisitionDate") ?? "");
    if (acquisitionDate && !/^\d{4}-\d{2}-\d{2}$/.test(acquisitionDate)) {
      nextErrors.acquisitionDate = "Fecha no válida.";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setServerError("Revisa los campos marcados en rojo antes de guardar.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setServerError(null);
    setPending(true);

    const payload = {
      name,
      zoneId,
      locationId: Number(fd.get("locationId")) || null,
      locationNote: String(fd.get("locationNote") ?? "").trim() || null,
      externalBarcode: String(fd.get("externalBarcode") ?? "").trim() || null,
      photoIds,
      itemType,
      quantity,
      minQuantity,
      category: fd.get("category"),
      status: fd.get("status"),
      condition: fd.get("condition"),
      acquisitionDate: acquisitionDate || null,
      estimatedValue: parsedMoney.value,
      description: String(fd.get("description") ?? ""),
      notes: String(fd.get("notes") ?? ""),
      photoId: photoIds[0] ?? null,
    };

    try {
      const res = await secureFetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setServerError(data.error ?? "No se pudo dar de alta el artículo.");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      router.refresh();
      setCreated({ id: data.id, code: data.code });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setServerError("Error de conexión. Inténtalo de nuevo.");
    } finally {
      setPending(false);
    }
  }

  /* ---------------- Página de éxito tras el alta ---------------- */
  if (created) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-12 sm:px-8">
        <div className="animate-fade-up rounded-3xl border border-emerald-200 bg-emerald-50/60 p-8 text-center shadow-card sm:p-10">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <Sparkles className="h-7 w-7" />
          </span>
          <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-ink">
            ¡Artículo dado de alta!
          </h1>
          <p className="mt-1.5 text-sm text-ink-soft">
            Su código único escaneable ya está asignado:
          </p>
          <span className="mt-4 inline-block rounded-2xl border border-emerald-300 bg-white px-6 py-3 font-mono text-3xl font-bold tracking-[0.22em] text-ink shadow-card">
            {created.code}
          </span>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-ink-soft">
            Imprime su etiqueta QR desde la ficha y pégala sobre el objeto. O
            continúa añadiendo artículos mientras recorres la parroquia.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-2.5">
            <Button
              variant="dark"
              onClick={() => router.push(`/inventario/${created.id}`)}
            >
              <Check className="h-4 w-4" />
              Ver ficha e imprimir QR
            </Button>
            <Button
              variant="primary"
              onClick={resetForAnother}
            >
              <PackagePlus className="h-4 w-4" />
              Añadir otro artículo
            </Button>
            <Button variant="outline" onClick={() => router.push("/inventario")}>
              Volver al inventario
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------- Formulario de alta ---------------- */
  return (
    <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8 lg:py-12">
      <Link
        href="/inventario"
        className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft transition hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver al inventario
      </Link>

      <header className="mt-5 animate-fade-up">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-gold">
          Parroquia Santa Bárbara
        </p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          Nuevo artículo
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">
          Rellena la ficha y al guardar se generará automáticamente su código
          único escaneable (QR) listo para imprimir.
        </p>
      </header>

      {zones.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-amber-200 bg-amber-50/80 p-6 text-sm leading-relaxed text-amber-900">
          <p className="font-bold text-amber-950">Primero crea una zona</p>
          <p className="mt-1">
            Cada artículo debe pertenecer a una ubicación física (Sacristía,
            Despacho, Salón Parroquial…).
          </p>
          <Link
            href="/zonas"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-xs font-semibold text-cream transition hover:bg-ink/85"
          >
            Crear la primera zona →
          </Link>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          data-item-form=""
          noValidate
          className="mt-8 animate-fade-up space-y-5"
          style={{ animationDelay: "120ms" }}
        >
          {serverError && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
            >
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              {serverError}
            </p>
          )}

          {/* ---------- Datos principales ---------- */}
          <section className="rounded-3xl border border-line bg-cream p-5 shadow-card sm:p-6">
            <h2 className="text-[0.66rem] font-bold uppercase tracking-[0.2em] text-gold-deep">
              Datos principales
            </h2>
            <div className="mt-4 grid gap-4">
              <div>
                <Field label="Nombre del artículo">
                  <input
                    name="name"
                    required
                    autoFocus
                    maxLength={160}
                    placeholder="Ej. Cáliz de plata dorada"
                    className={cn(inputCls, errors.name && "border-red-300 ring-red-100")}
                  />
                </Field>
                {errors.name && (
                  <p className="mt-1 text-xs font-medium text-red-600">{errors.name}</p>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Field label="Zona de la parroquia">
                    <select
                      name="zoneId"
                      required
                      value={selectedZoneId}
                      onChange={(e) => setSelectedZoneId(Number(e.target.value))}
                      className={cn(inputCls, errors.zoneId && "border-red-300 ring-red-100")}
                    >
                      {zones.map((z) => (
                        <option key={z.id} value={z.id}>
                          {z.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  {errors.zoneId && (
                    <p className="mt-1 text-xs font-medium text-red-600">{errors.zoneId}</p>
                  )}
                </div>
                <Field label="Categoría">
                  <select name="category" defaultValue={categories[0]?.name} className={inputCls}>
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Ubicación detallada" hint="Armario, estante o caja (opcional)">
                  <select name="locationId" defaultValue="" className={inputCls}>
                    <option value="">Sin detallar</option>
                    {locations.filter((l) => l.zoneId === selectedZoneId).map((l) => (
                      <option key={l.id} value={l.id}>{l.parentId ? "↳ " : ""}{l.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Lugar exacto en esa ubicación" hint="ej. cajón de plata, fondo derecho">
                  <input name="locationNote" maxLength={300} placeholder="Detalle adicional del lugar" className={inputCls} />
                </Field>
                <Field label="Código de barras comercial" hint="EAN, UPC o Code-128 (opcional)">
                  <input name="externalBarcode" maxLength={128} placeholder="Escanéalo o escríbelo" className={`${inputCls} font-mono`} />
                </Field>
              </div>
            </div>
          </section>

          {/* ---------- Tipo de control ---------- */}
          <section className="rounded-3xl border border-line bg-cream p-5 shadow-card sm:p-6">
            <h2 className="text-[0.66rem] font-bold uppercase tracking-[0.2em] text-gold-deep">
              Tipo de control
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              {(
                [
                  { value: "UNICO", icon: Church, title: "Pieza única", hint: "1 unidad. Control por estado." },
                  { value: "CONTABLE", icon: Boxes, title: "Acumulable", hint: "Control numérico de unidades." },
                ] as const
              ).map((opt) => {
                const active = itemType === opt.value;
                return (
                  <label
                    key={opt.value}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-3.5 transition",
                      active ? "border-gold bg-gold/10" : "border-line bg-white/60 hover:border-ink/25",
                    )}
                  >
                    <input
                      type="radio"
                      name="itemType"
                      value={opt.value}
                      checked={active}
                      onChange={() => setItemType(opt.value)}
                      className="sr-only"
                    />
                    <opt.icon
                      className={cn("mt-0.5 h-5 w-5 shrink-0", active ? "text-gold-deep" : "text-ink-faint")}
                    />
                    <span>
                      <span className="block text-sm font-bold text-ink">{opt.title}</span>
                      <span className="block text-[0.68rem] leading-tight text-ink-soft">
                        {opt.hint}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>

            {itemType === "CONTABLE" && (
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <Field label="Cantidad actual">
                    <input
                      name="quantity"
                      type="number"
                      min={0}
                      inputMode="numeric"
                      defaultValue={0}
                      className={cn(inputCls, errors.quantity && "border-red-300 ring-red-100")}
                    />
                  </Field>
                  {errors.quantity && (
                    <p className="mt-1 text-xs font-medium text-red-600">{errors.quantity}</p>
                  )}
                </div>
                <div>
                  <Field label="Stock mínimo (alerta)">
                    <input
                      name="minQuantity"
                      type="number"
                      min={0}
                      inputMode="numeric"
                      defaultValue={0}
                      className={cn(inputCls, errors.minQuantity && "border-red-300 ring-red-100")}
                    />
                  </Field>
                  {errors.minQuantity && (
                    <p className="mt-1 text-xs font-medium text-red-600">{errors.minQuantity}</p>
                  )}
                </div>
              </div>
            )}
            {itemType === "UNICO" && <input type="hidden" name="quantity" value="1" />}
          </section>

          {/* ---------- Estado y conservación ---------- */}
          <section className="rounded-3xl border border-line bg-cream p-5 shadow-card sm:p-6">
            <h2 className="text-[0.66rem] font-bold uppercase tracking-[0.2em] text-gold-deep">
              Estado y conservación
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Estado">
                <select name="status" defaultValue="DISPONIBLE" className={inputCls}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Conservación">
                <select name="condition" defaultValue="BUENO" className={inputCls}>
                  {CONDITIONS.map((c) => (
                    <option key={c} value={c}>
                      {CONDITION_LABELS[c]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </section>

          {/* ---------- Valor y procedencia ---------- */}
          <section className="rounded-3xl border border-line bg-cream p-5 shadow-card sm:p-6">
            <h2 className="text-[0.66rem] font-bold uppercase tracking-[0.2em] text-gold-deep">
              Valor y procedencia
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <Field label="Valor estimado (€)" hint="Ej. 1.200,50 (acepta comas)">
                  <input
                    name="estimatedValueText"
                    inputMode="decimal"
                    value={money}
                    onChange={(e) => setMoney(e.target.value)}
                    placeholder="0,00"
                    className={cn(inputCls, "font-mono", errors.money && "border-red-300 ring-red-100")}
                  />
                </Field>
                {errors.money && (
                  <p className="mt-1 text-xs font-medium text-red-600">{errors.money}</p>
                )}
              </div>
              <div>
                <Field label="Fecha de adquisición">
                  <input
                    name="acquisitionDate"
                    type="date"
                    className={cn(inputCls, errors.acquisitionDate && "border-red-300 ring-red-100")}
                  />
                </Field>
                {errors.acquisitionDate && (
                  <p className="mt-1 text-xs font-medium text-red-600">{errors.acquisitionDate}</p>
                )}
              </div>
            </div>
          </section>

          {/* ---------- Fotografía ---------- */}
          <section className="rounded-3xl border border-line bg-cream p-5 shadow-card sm:p-6">
            <h2 className="text-[0.66rem] font-bold uppercase tracking-[0.2em] text-gold-deep">
              Fotografía
            </h2>
            <div className="mt-4">
              <PhotoGalleryUploader value={photoIds} onChange={setPhotoIds} />
            </div>
          </section>

          {/* ---------- Descripción y notas ---------- */}
          <section className="rounded-3xl border border-line bg-cream p-5 shadow-card sm:p-6">
            <h2 className="text-[0.66rem] font-bold uppercase tracking-[0.2em] text-gold-deep">
              Descripción y notas
            </h2>
            <div className="mt-4 grid gap-4">
              <Field label="Descripción">
                <textarea
                  name="description"
                  rows={2}
                  maxLength={2000}
                  placeholder="Detalles, procedencia, inscripciones…"
                  className={cn(inputCls, "resize-none")}
                />
              </Field>
              <Field label="Notas internas">
                <textarea
                  name="notes"
                  rows={2}
                  maxLength={2000}
                  placeholder="Mantenimiento, llaves, responsable…"
                  className={cn(inputCls, "resize-none")}
                />
              </Field>
            </div>
          </section>

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line-soft pt-4">
            <Link
              href="/inventario"
              className="inline-flex items-center rounded-full px-5 py-2.5 text-sm font-semibold text-ink-soft transition hover:bg-ink/5 hover:text-ink"
            >
              Cancelar
            </Link>
            <Button type="submit" variant="dark" disabled={pending}>
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PackagePlus className="h-4 w-4" />
              )}
              {pending ? "Guardando…" : "Dar de alta"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

