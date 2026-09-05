"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Boxes,
  Church,
  Loader2,
  PackagePlus,
  Save,
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
import type { Item, Zone } from "@/db/schema";
import { Button, Field, Modal, inputCls } from "@/components/ui";
import { PhotoUploader } from "@/components/photo-uploader";
import { secureFetch } from "@/lib/secure-fetch";
import { cn } from "@/lib/utils";

export type ItemEditable = Partial<Item> & { id?: number };

type FieldErrors = Record<string, string>;

/** Dinero en formato español: acepta "1.200,50", "1200.50" o "1200". */
export function parseMoneyInput(raw: string): { ok: boolean; value: number | null } {
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

export function ItemForm({
  open,
  onClose,
  zones,
  item,
  defaultZoneId,
}: {
  open: boolean;
  onClose: () => void;
  zones: Zone[];
  item?: ItemEditable | null;
  defaultZoneId?: number;
}) {
  const router = useRouter();
  const editing = Boolean(item?.id);
  const [pending, setPending] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [itemType, setItemType] = useState<string>("UNICO");
  const [photoId, setPhotoId] = useState<number | null>(null);
  const [money, setMoney] = useState("");
  // Pantalla de éxito tras crear (flujo "añadir en serie")
  const [created, setCreated] = useState<{ id: number; code: string } | null>(null);

  useEffect(() => {
    if (open) {
      setServerError(null);
      setErrors({});
      setItemType(item?.itemType ?? "UNICO");
      setPhotoId(item?.photoId ?? null);
      setMoney(item?.estimatedValue ? String(item.estimatedValue).replace(".", ",") : "");
      setCreated(null);
    }
  }, [open, item]);

  function resetForAnother(form: HTMLFormElement) {
    form.reset();
    setItemType("UNICO");
    setPhotoId(null);
    setMoney("");
    setErrors({});
    setCreated(null);
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

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setServerError("Revisa los campos marcados en rojo antes de guardar.");
      return;
    }
    setServerError(null);
    setPending(true);

    const payload = {
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
      description: String(fd.get("description") ?? ""),
      notes: String(fd.get("notes") ?? ""),
      photoId,
    };

    try {
      const res = await secureFetch(
        editing ? `/api/items/${item!.id}` : "/api/items",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setServerError(data.error ?? "No se pudo guardar el artículo.");
        return;
      }
      router.refresh();
      if (editing) {
        onClose();
        router.push(`/inventario/${item!.id}`);
      } else {
        setCreated({ id: data.id, code: data.code });
      }
    } catch {
      setServerError("Error de conexión. Inténtalo de nuevo.");
    } finally {
      setPending(false);
    }
  }

  const zoneColor =
    zones.find((z) => z.id === defaultZoneId || z.id === item?.zoneId)?.color ??
    zones[0]?.color;

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={editing ? "Editar artículo" : created ? "Artículo dado de alta" : "Nuevo artículo"}
      subtitle={
        editing
          ? `${item?.code} · Los cambios quedan registrados en el historial`
          : created
            ? "Se generó su código único escaneable"
            : "Se generará automáticamente un código único escaneable"
      }
    >
      {/* ---------- Pantalla de éxito tras crear ---------- */}
      {created && !editing ? (
        <div className="py-4 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <Sparkles className="h-6 w-6" />
          </span>
          <p className="mt-4 font-display text-2xl font-semibold text-ink">
            ¡Listo! Código generado
          </p>
          <span className="mt-3 inline-block rounded-xl border border-line bg-white px-5 py-2.5 font-mono text-2xl font-bold tracking-[0.2em] text-ink">
            {created.code}
          </span>
          <p className="mx-auto mt-3 max-w-sm text-sm text-ink-soft">
            Ya puedes imprimir su etiqueta QR desde la ficha y pegarla sobre el
            objeto, o continuar añadiendo artículos mientras recorres la parroquia.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button
              variant="dark"
              onClick={() => {
                onClose();
                router.push(`/inventario/${created.id}`);
              }}
            >
              Ver ficha e imprimir QR
            </Button>
            <Button variant="primary" onClick={() => {
              const form = document.querySelector("form[data-item-form]") as HTMLFormElement | null;
              if (form) resetForAnother(form);
            }}>
              <PackagePlus className="h-4 w-4" />
              Añadir otro {zoneColor ? "" : ""}
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} data-item-form="" className="space-y-5" noValidate>
          {/* ---------- Campos con problemas (resumen accesible) ---------- */}
          {serverError && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700"
            >
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              {serverError}
            </p>
          )}

          {zones.length === 0 && !editing && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-xs leading-relaxed text-amber-900">
              <p className="font-bold text-amber-950">Primero crea una zona</p>
              <Link
                href="/zonas"
                onClick={onClose}
                className="mt-1.5 inline-block font-bold uppercase tracking-wider text-[0.68rem] text-gold-deep"
              >
                Ir a Zonas →
              </Link>
            </div>
          )}

          {/* ---------- Datos principales ---------- */}
          <fieldset>
            <legend className="mb-3 text-[0.66rem] font-bold uppercase tracking-[0.2em] text-gold-deep">
              Datos principales
            </legend>
            <div className="grid gap-4">
              <div>
                <Field label="Nombre del artículo">
                  <input
                    name="name"
                    required
                    maxLength={160}
                    defaultValue={item?.name ?? ""}
                    placeholder="Ej. Cáliz de plata dorada"
                    className={cn(inputCls, errors.name && "border-red-300 ring-red-100")}
                  />
                </Field>
                {errors.name && <p className="mt-1 text-xs font-medium text-red-600">{errors.name}</p>}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Field label="Zona de la parroquia">
                    <select
                      name="zoneId"
                      required
                      defaultValue={item?.zoneId ?? defaultZoneId ?? zones[0]?.id}
                      disabled={zones.length === 0}
                      className={cn(inputCls, errors.zoneId && "border-red-300 ring-red-100")}
                      style={zoneColor ? { borderLeftWidth: 4, borderLeftColor: zoneColor } : undefined}
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
                    defaultValue={item?.category ?? CATEGORIES[0]}
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
          </fieldset>

          {/* ---------- Tipo de control ---------- */}
          <fieldset>
            <legend className="mb-3 text-[0.66rem] font-bold uppercase tracking-[0.2em] text-gold-deep">
              Tipo de control
            </legend>
            <div className="grid grid-cols-2 gap-2.5">
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
                      defaultValue={item?.quantity ?? 0}
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
                      defaultValue={item?.minQuantity ?? 0}
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
          </fieldset>

          {/* ---------- Estado y conservación ---------- */}
          <fieldset>
            <legend className="mb-3 text-[0.66rem] font-bold uppercase tracking-[0.2em] text-gold-deep">
              Estado y conservación
            </legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Estado">
                <select name="status" defaultValue={item?.status ?? "DISPONIBLE"} className={inputCls}>
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
                  defaultValue={item?.condition ?? "BUENO"}
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
          </fieldset>

          {/* ---------- Valor y procedencia ---------- */}
          <fieldset>
            <legend className="mb-3 text-[0.66rem] font-bold uppercase tracking-[0.2em] text-gold-deep">
              Valor y procedencia
            </legend>
            <div className="grid gap-4 sm:grid-cols-2">
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
                {errors.money && <p className="mt-1 text-xs font-medium text-red-600">{errors.money}</p>}
              </div>
              <div>
                <Field label="Fecha de adquisición">
                  <input
                    name="acquisitionDate"
                    type="date"
                    defaultValue={item?.acquisitionDate ?? ""}
                    className={cn(inputCls, errors.acquisitionDate && "border-red-300 ring-red-100")}
                  />
                </Field>
                {errors.acquisitionDate && (
                  <p className="mt-1 text-xs font-medium text-red-600">{errors.acquisitionDate}</p>
                )}
              </div>
            </div>
          </fieldset>

          {/* ---------- Fotografía ---------- */}
          <fieldset>
            <legend className="mb-3 text-[0.66rem] font-bold uppercase tracking-[0.2em] text-gold-deep">
              Fotografía
            </legend>
            <PhotoUploader value={photoId} onChange={setPhotoId} />
          </fieldset>

          {/* ---------- Notas ---------- */}
          <fieldset>
            <legend className="mb-3 text-[0.66rem] font-bold uppercase tracking-[0.2em] text-gold-deep">
              Descripción y notas
            </legend>
            <div className="grid gap-4">
              <Field label="Descripción">
                <textarea
                  name="description"
                  rows={2}
                  maxLength={2000}
                  defaultValue={item?.description ?? ""}
                  placeholder="Detalles, procedencia, inscripciones…"
                  className={cn(inputCls, "resize-none")}
                />
              </Field>
              <Field label="Notas internas">
                <textarea
                  name="notes"
                  rows={2}
                  maxLength={2000}
                  defaultValue={item?.notes ?? ""}
                  placeholder="Mantenimiento, llaves, responsable…"
                  className={cn(inputCls, "resize-none")}
                />
              </Field>
            </div>
          </fieldset>

          <div className="flex flex-wrap justify-end gap-2 border-t border-line-soft pt-4">
            <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="dark"
              disabled={pending || (zones.length === 0 && !editing)}
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editing ? (
                <Save className="h-4 w-4" />
              ) : (
                <PackagePlus className="h-4 w-4" />
              )}
              {pending ? "Guardando…" : editing ? "Guardar cambios" : "Dar de alta"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
