"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, PackagePlus, Save } from "lucide-react";
import Link from "next/link";
import { CATEGORIES, CONDITIONS, CONDITION_LABELS, STATUSES, STATUS_LABELS } from "@/lib/constants";
import type { Item, Zone } from "@/db/schema";
import { Button, Field, Modal, inputCls } from "@/components/ui";
import { PhotoUploader } from "@/components/photo-uploader";
import { cn } from "@/lib/utils";
import { TriangleAlert } from "lucide-react";

export type ItemEditable = Partial<Item> & { id?: number };

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
  const [error, setError] = useState<string | null>(null);
  const [itemType, setItemType] = useState<string>("UNICO");
  const [photoId, setPhotoId] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      setItemType(item?.itemType ?? "UNICO");
      setPhotoId(item?.photoId ?? null);
    }
  }, [open, item]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: fd.get("name"),
      zoneId: Number(fd.get("zoneId")),
      itemType: fd.get("itemType"),
      quantity: Number(fd.get("quantity") || 1),
      minQuantity: Number(fd.get("minQuantity") || 0),
      category: fd.get("category"),
      status: fd.get("status"),
      condition: fd.get("condition"),
      acquisitionDate: fd.get("acquisitionDate"),
      estimatedValue: fd.get("estimatedValue"),
      description: fd.get("description"),
      notes: fd.get("notes"),
      photoId,
    };

    try {
      const res = await fetch(
        editing ? `/api/items/${item!.id}` : "/api/items",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo guardar el artículo.");
        return;
      }
      onClose();
      router.refresh();
      if (!editing && data.id) router.push(`/inventario/${data.id}`);
    } catch {
      setError("Error de conexión. Inténtalo de nuevo.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={editing ? "Editar artículo" : "Nuevo artículo"}
      subtitle={
        editing
          ? `${item?.code} · Los cambios quedan registrados en el historial`
          : "Se generará automáticamente un código único escaneable"
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Nombre del artículo">
              <input
                name="name"
                required
                defaultValue={item?.name ?? ""}
                placeholder="Ej. Cáliz de plata dorada"
                className={inputCls}
              />
            </Field>
          </div>

          {zones.length === 0 ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-xs leading-relaxed text-amber-900 sm:col-span-2">
              <p className="flex items-center gap-1.5 font-bold text-amber-950">
                <TriangleAlert className="h-4 w-4 shrink-0 text-amber-700" />
                No hay zonas creadas todavía
              </p>
              <p className="mt-1">
                Cada artículo debe pertenecer a una ubicación física (ej. Sacristía, Despacho, Salón Parroquial).
              </p>
              <Link
                href="/zonas"
                onClick={onClose}
                className="mt-2.5 inline-flex items-center gap-1.5 font-bold uppercase tracking-wider text-[0.68rem] text-gold-deep hover:text-gold"
              >
                Crear una zona primero →
              </Link>
            </div>
          ) : (
            <Field label="Zona de la parroquia">
              <select
                name="zoneId"
                required
                defaultValue={item?.zoneId ?? defaultZoneId ?? zones[0]?.id}
                className={inputCls}
              >
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <Field label="Tipo de control">
            <div className="grid grid-cols-2 gap-2">
              {(["UNICO", "CONTABLE"] as const).map((t) => (
                <label
                  key={t}
                  className={cn(
                    "flex cursor-pointer flex-col rounded-xl border px-3 py-2.5 transition",
                    itemType === t
                      ? "border-gold bg-gold/10"
                      : "border-line bg-white/60 hover:border-ink/20",
                  )}
                >
                  <input
                    type="radio"
                    name="itemType"
                    value={t}
                    checked={itemType === t}
                    onChange={() => setItemType(t)}
                    className="sr-only"
                  />
                  <span className="text-xs font-bold text-ink">
                    {t === "UNICO" ? "Pieza única" : "Acumulable"}
                  </span>
                  <span className="text-[0.65rem] leading-tight text-ink-soft">
                    {t === "UNICO"
                      ? "1 unidad, se controla su estado"
                      : "Se controla el número de unidades"}
                  </span>
                </label>
              ))}
            </div>
          </Field>

          {itemType === "CONTABLE" && (
            <>
              <Field label="Cantidad actual">
                <input
                  name="quantity"
                  type="number"
                  min={0}
                  required
                  defaultValue={item?.quantity ?? 0}
                  className={inputCls}
                />
              </Field>
              <Field label="Stock mínimo (alerta)" hint="Aviso cuando baje de este número">
                <input
                  name="minQuantity"
                  type="number"
                  min={0}
                  defaultValue={item?.minQuantity ?? 0}
                  className={inputCls}
                />
              </Field>
            </>
          )}
          {itemType === "UNICO" && <input type="hidden" name="quantity" value="1" />}

          <Field label="Categoría">
            <select name="category" defaultValue={item?.category ?? CATEGORIES[0]} className={inputCls}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>

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
            <select name="condition" defaultValue={item?.condition ?? "BUENO"} className={inputCls}>
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {CONDITION_LABELS[c]}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Fecha de adquisición">
            <input
              name="acquisitionDate"
              type="date"
              defaultValue={item?.acquisitionDate ?? ""}
              className={inputCls}
            />
          </Field>

          <Field label="Valor estimado (€)">
            <input
              name="estimatedValue"
              type="number"
              min={0}
              step="0.01"
              placeholder="Opcional"
              defaultValue={item?.estimatedValue ?? ""}
              className={inputCls}
            />
          </Field>

          <div className="sm:col-span-2">
            <Field label="Descripción">
              <textarea
                name="description"
                rows={2}
                defaultValue={item?.description ?? ""}
                placeholder="Detalles, procedencia, inscripciones…"
                className={cn(inputCls, "resize-none")}
              />
            </Field>
          </div>

          <div className="sm:col-span-2">
            <Field label="Notas internas">
              <textarea
                name="notes"
                rows={2}
                defaultValue={item?.notes ?? ""}
                placeholder="Observaciones de mantenimiento, llaves, responsables…"
                className={cn(inputCls, "resize-none")}
              />
            </Field>
          </div>

          <div className="sm:col-span-2">
            <Field label="Fotografía del artículo">
              <PhotoUploader value={photoId} onChange={setPhotoId} />
            </Field>
          </div>
        </div>

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 border-t border-line-soft pt-4">
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
            {editing ? "Guardar cambios" : "Dar de alta"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
