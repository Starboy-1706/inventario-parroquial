"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Boxes,
  Church,
  Loader2,
  Ruler,
  Save,
  TriangleAlert,
} from "lucide-react";
import {
  CATEGORIES,
  CONDITIONS,
  CONDITION_LABELS,
  STATUSES,
  STATUS_LABELS,
} from "@/lib/constants";
import type { Item, Zone } from "@/db/schema";
import { Button, Field, inputCls } from "@/components/ui";
import { PhotoUploader } from "@/components/photo-uploader";
import { secureFetch } from "@/lib/secure-fetch";
import { cn } from "@/lib/utils";
import { parseDimInput, parseMoneyInput } from "@/components/item-create-form";

export type ItemEditable = Partial<Item> & { id?: number };

type FieldErrors = Record<string, string>;

/** Formulario de edición de artículo a página completa (sin ventanas flotantes). */
export function ItemEditForm({
  zones,
  item,
}: {
  zones: Zone[];
  item: Item;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [itemType, setItemType] = useState<string>(item.itemType);
  const [photoId, setPhotoId] = useState<number | null>(item.photoId);
  const [money, setMoney] = useState(
    item.estimatedValue ? String(item.estimatedValue).replace(".", ",") : "",
  );

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
      if (!Number.isInteger(qn) || qn < 0) {
        nextErrors.quantity = "Cantidad válida: 0 o más.";
      } else quantity = qn;
      const m = String(fd.get("minQuantity") ?? "").trim();
      const mn = m === "" ? 0 : Number(m);
      if (!Number.isInteger(mn) || mn < 0) {
        nextErrors.minQuantity = "Mínimo válido: 0 o más.";
      } else minQuantity = mn;
    }

    const parsedMoney = parseMoneyInput(money);
    if (!parsedMoney.ok) {
      nextErrors.money = "Formato no válido. Ejemplo: 1.200,50";
    }

    const acquisitionDate = String(fd.get("acquisitionDate") ?? "");
    if (acquisitionDate && !/^\d{4}-\d{2}-\d{2}$/.test(acquisitionDate)) {
      nextErrors.acquisitionDate = "Fecha no válida.";
    }

    const dimLength = parseDimInput(String(fd.get("dimLengthCm") ?? ""));
    const dimWidth = parseDimInput(String(fd.get("dimWidthCm") ?? ""));
    const dimHeight = parseDimInput(String(fd.get("dimHeightCm") ?? ""));
    if (!dimLength.ok || !dimWidth.ok || !dimHeight.ok) {
      nextErrors.dims = "Medida no válida. Usa números: 30 · 30,5 · 30.5";
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
      version: item.version,
      name,
      zoneId,
      itemType,
      quantity,
      minQuantity,
      category: fd.get("category"),
      status: fd.get("status"),
      condition: fd.get("condition"),
      acquisitionDate: acquisitionDate || null,
      estimatedValue: parsedMoney.value,
      dimLengthCm: dimLength.value,
      dimWidthCm: dimWidth.value,
      dimHeightCm: dimHeight.value,
      description: String(fd.get("description") ?? ""),
      notes: String(fd.get("notes") ?? ""),
      photoId,
    };

    try {
      const res = await secureFetch(`/api/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setServerError(data.error ?? "No se pudo guardar el artículo.");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      router.refresh();
      router.push(`/inventario/${item.id}`);
    } catch {
      setServerError("Error de conexión. Inténtalo de nuevo.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setPending(false);
    }
  }

  const zoneColor =
    zones.find((z) => z.id === item.zoneId)?.color ?? zones[0]?.color;

  return (
    <div className="mx-auto max-w-3xl px-4 py-5 pb-32 sm:px-8 sm:pb-12 lg:py-12">
      <Link
        href={`/inventario/${item.id}`}
        className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft transition hover:text-ink active:scale-95"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver a la ficha
      </Link>

      <header className="mt-4 animate-fade-up">
        <p className="font-mono text-xs font-bold tracking-[0.22em] text-gold-deep">
          {item.code}
        </p>
        <h1 className="mt-1.5 font-display text-2xl font-semibold tracking-tight text-ink sm:text-4xl lg:text-5xl">
          Editar artículo
        </h1>
        <p className="mt-1.5 max-w-xl text-xs leading-relaxed text-ink-soft sm:text-sm">
          Los cambios quedan registrados en el historial de movimientos con
          fecha y hora.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        data-item-form=""
        className="mt-8 animate-fade-up space-y-5"
        style={{ animationDelay: "120ms" }}
        noValidate
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
                  maxLength={160}
                  defaultValue={item.name}
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
                    defaultValue={item.zoneId}
                    className={cn(inputCls, errors.zoneId && "border-red-300 ring-red-100")}
                    style={
                      zoneColor
                        ? { borderLeftWidth: 4, borderLeftColor: zoneColor }
                        : undefined
                    }
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
                <select
                  name="category"
                  defaultValue={item.category ?? CATEGORIES[0]}
                  className={inputCls}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
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
                <Field
                  label="Cantidad actual"
                  hint="Se imprimirá una etiqueta numerada por unidad"
                >
                  <input
                    name="quantity"
                    type="number"
                    min={0}
                    inputMode="numeric"
                    defaultValue={item.quantity}
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
                    defaultValue={item.minQuantity}
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
              <select name="status" defaultValue={item.status} className={inputCls}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Conservación">
              <select
                name="condition"
                defaultValue={item.condition}
                className={inputCls}
              >
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
                  defaultValue={item.acquisitionDate ?? ""}
                  className={cn(inputCls, errors.acquisitionDate && "border-red-300 ring-red-100")}
                />
              </Field>
              {errors.acquisitionDate && (
                <p className="mt-1 text-xs font-medium text-red-600">
                  {errors.acquisitionDate}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ---------- Medidas del artículo ---------- */}
        <section className="rounded-3xl border border-line bg-cream p-5 shadow-card sm:p-6">
          <h2 className="flex items-center gap-2 text-[0.66rem] font-bold uppercase tracking-[0.2em] text-gold-deep">
            <Ruler className="h-3.5 w-3.5" />
            Medidas del artículo (cm)
          </h2>
          <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">
            Largo × ancho × alto. Todas opcionales: rellena solo las que conozcas.
          </p>
          <div className="mt-4 grid grid-cols-3 gap-3 sm:gap-4">
            <Field label="Largo (cm)">
              <input
                name="dimLengthCm"
                inputMode="decimal"
                defaultValue={item.dimLengthCm ?? ""}
                placeholder="30"
                className={cn(inputCls, "text-center font-mono", errors.dims && "border-red-300 ring-red-100")}
              />
            </Field>
            <Field label="Ancho (cm)">
              <input
                name="dimWidthCm"
                inputMode="decimal"
                defaultValue={item.dimWidthCm ?? ""}
                placeholder="20"
                className={cn(inputCls, "text-center font-mono", errors.dims && "border-red-300 ring-red-100")}
              />
            </Field>
            <Field label="Alto (cm)">
              <input
                name="dimHeightCm"
                inputMode="decimal"
                defaultValue={item.dimHeightCm ?? ""}
                placeholder="15"
                className={cn(inputCls, "text-center font-mono", errors.dims && "border-red-300 ring-red-100")}
              />
            </Field>
          </div>
          {errors.dims && (
            <p className="mt-2 text-xs font-medium text-red-600">{errors.dims}</p>
          )}
        </section>

        {/* ---------- Fotografía ---------- */}
        <section className="rounded-3xl border border-line bg-cream p-5 shadow-card sm:p-6">
          <h2 className="text-[0.66rem] font-bold uppercase tracking-[0.2em] text-gold-deep">
            Fotografía
          </h2>
          <div className="mt-4">
            <PhotoUploader value={photoId} onChange={setPhotoId} />
          </div>
        </section>

        {/* ---------- Descripción y notas ---------- */}
        <section className="rounded-3xl border border-line bg-cream p-5 shadow-card sm:p-6">
          <h2 className="text-[0.66rem] font-bold uppercase tracking-[0.2em] text-gold-deep">
            Descripción y notas
          </h2>
          <div className="mt-4 grid gap-4">
            <Field
              label="Descripción"
              hint="Aparecerá en la ficha del artículo y en el listado"
            >
              <textarea
                name="description"
                rows={3}
                maxLength={2000}
                defaultValue={item.description ?? ""}
                placeholder="Detalles, procedencia, inscripciones…"
                className={cn(inputCls, "resize-none")}
              />
            </Field>
            <Field label="Notas internas">
              <textarea
                name="notes"
                rows={2}
                maxLength={2000}
                defaultValue={item.notes ?? ""}
                placeholder="Mantenimiento, llaves, responsable…"
                className={cn(inputCls, "resize-none")}
              />
            </Field>
          </div>
        </section>

        {/* Barra de acción */}
        <div className="fixed inset-x-0 z-[45] flex items-center justify-between gap-3 border-t border-line bg-cream/95 px-4 py-3 shadow-[0_-8px_24px_rgba(33,28,18,.10)] backdrop-blur-xl sm:static sm:z-auto sm:border-t sm:border-line-soft sm:bg-transparent sm:p-0 sm:pt-4 sm:shadow-none"
          style={{ bottom: "calc(4.35rem + env(safe-area-inset-bottom))" }}
        >
          <Link
            href={`/inventario/${item.id}`}
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
