"use client";

import { secureFetch } from "@/lib/secure-fetch";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Loader2,
  MapPinPlus,
  PencilLine,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import type { ZoneWithCount } from "@/lib/queries";
import { ZONE_COLORS, ZONE_ICONS } from "@/lib/constants";
import { Button, Field, Modal, ZoneIcon, inputCls } from "@/components/ui";
import { EmptyState } from "@/components/empty-state";
import { PhotoUploader } from "@/components/photo-uploader";
import { cn, photoUrl } from "@/lib/utils";
import { MapPinned } from "lucide-react";

type ZoneFormState = {
  id?: number;
  name: string;
  description: string;
  color: string;
  icon: string;
  photoId: number | null;
};

const EMPTY: ZoneFormState = {
  name: "",
  description: "",
  color: ZONE_COLORS[0],
  icon: "church",
  photoId: null,
};

function ZoneFormModal({
  open,
  onClose,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  initial: { current: ZoneFormState };
}) {
  const router = useRouter();
  const [form, setForm] = useState<ZoneFormState>(initial.current);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editing = Boolean(form.id);

  // Sincroniza el formulario al abrir, sin actualizar estado durante el render.
  useEffect(() => {
    if (open) {
      setForm(initial.current);
      setError(null);
    }
  }, [open, initial]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await secureFetch(editing ? `/api/zones/${form.id}` : "/api/zones", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo guardar la zona.");
        return;
      }
      onClose();
      router.refresh();
    } catch {
      setError("Error de conexión.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Editar zona" : "Nueva zona"}
      subtitle="Las zonas son ubicaciones físicas de la parroquia"
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Nombre de la zona">
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ej. Sacristía, Despacho, Salón Parroquial…"
            className={inputCls}
          />
        </Field>
        <Field label="Descripción">
          <input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Qué se guarda en esta zona…"
            className={inputCls}
          />
        </Field>

        <Field label="Fotografía de la zona">
          <PhotoUploader
            value={form.photoId}
            onChange={(id) => setForm({ ...form, photoId: id })}
            hint="Una vista del espacio ayuda a reconocerlo al inventariar"
          />
        </Field>

        <Field label="Color distintivo">
          <div className="flex flex-wrap gap-2">
            {ZONE_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setForm({ ...form, color: c })}
                className={cn(
                  "h-9 w-9 cursor-pointer rounded-full border-2 transition-transform hover:scale-110",
                  form.color === c ? "border-ink scale-110" : "border-transparent",
                )}
                style={{ backgroundColor: c }}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
        </Field>

        <Field label="Icono">
          <div className="grid grid-cols-5 gap-2">
            {ZONE_ICONS.map((icon) => (
              <button
                key={icon}
                type="button"
                onClick={() => setForm({ ...form, icon })}
                className={cn(
                  "flex h-11 cursor-pointer items-center justify-center rounded-xl border transition",
                  form.icon === icon
                    ? "border-gold bg-gold/10"
                    : "border-line bg-white/60 hover:border-ink/25",
                )}
              >
                <ZoneIcon icon={icon} color={form.icon === icon ? form.color : "#6f6552"} size="sm" />
              </button>
            ))}
          </div>
        </Field>

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-line-soft pt-4">
          <div className="flex items-center gap-2.5 rounded-xl border border-line bg-white/60 px-3 py-2">
            <ZoneIcon icon={form.icon} color={form.color} size="sm" />
            <span className="text-xs font-semibold text-ink">
              {form.name || "Vista previa"}
            </span>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" variant="dark" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? "Guardar" : "Crear zona"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

export function ZoneManager({ zones }: { zones: ZoneWithCount[] }) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [formInitial, setFormInitial] = useState<{ current: ZoneFormState }>({
    current: EMPTY,
  });
  const [toDelete, setToDelete] = useState<ZoneWithCount | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function openCreate() {
    setFormInitial({ current: EMPTY });
    setModalOpen(true);
  }

  function openEdit(z: ZoneWithCount) {
    setFormInitial({
      current: {
        id: z.id,
        name: z.name,
        description: z.description ?? "",
        color: z.color,
        icon: z.icon,
        photoId: z.photoId,
      },
    });
    setModalOpen(true);
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    setDeleteError(null);
    const res = await secureFetch(`/api/zones/${toDelete.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setDeleting(false);
    if (!res.ok) {
      setDeleteError(data.error ?? "No se pudo eliminar la zona.");
      return;
    }
    setToDelete(null);
    router.refresh();
  }

  return (
    <>
      <div className="flex justify-end">
        <Button variant="dark" onClick={openCreate}>
          <MapPinPlus className="h-4 w-4" />
          Nueva zona
        </Button>
      </div>

      {zones.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={MapPinned}
            title="Aún no hay zonas"
            description="Crea la primera ubicación física de la parroquia para empezar a clasificar el inventario."
          />
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {zones.map((z) => {
            const zPhoto = photoUrl(z.photoId);
            return (
              <li
                key={z.id}
                className="group relative flex flex-col overflow-hidden rounded-3xl border border-line bg-cream shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift"
              >
                {zPhoto && (
                  <div className="relative h-36 w-full overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={zPhoto}
                      alt={`Fotografía de ${z.name}`}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <span className="absolute inset-0 bg-gradient-to-t from-ink/40 via-transparent to-transparent" />
                  </div>
                )}
                <span
                  className="absolute inset-x-0 top-0 z-10 h-1.5"
                  style={{ backgroundColor: z.color }}
                />
                <div className="flex flex-1 flex-col p-5">
                  <div className={cn("flex items-start justify-between", zPhoto && "-mt-10")}>
                    <span className={cn(zPhoto && "rounded-2xl bg-cream p-1 shadow-lift")}>
                      <ZoneIcon icon={z.icon} color={z.color} size="lg" />
                    </span>
                    <div className="flex gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100 focus-within:opacity-100">
                      <button
                        onClick={() => openEdit(z)}
                        aria-label={`Editar ${z.name}`}
                        className="cursor-pointer rounded-full bg-cream/90 p-2 text-ink-soft shadow-sm transition hover:bg-ink/5 hover:text-ink"
                      >
                        <PencilLine className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setToDelete(z);
                          setDeleteError(null);
                        }}
                        aria-label={`Eliminar ${z.name}`}
                        className="cursor-pointer rounded-full bg-cream/90 p-2 text-ink-soft shadow-sm transition hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <h3 className="mt-4 font-display text-xl font-semibold tracking-tight text-ink">
                    {z.name}
                  </h3>
                  <p className="mt-1 line-clamp-2 min-h-8 text-xs leading-relaxed text-ink-soft">
                    {z.description ?? "Sin descripción."}
                  </p>
                  <div className="mt-4 flex items-end justify-between border-t border-line-soft pt-3.5">
                    <p className="text-xs text-ink-soft">
                      <span className="font-display text-2xl font-semibold text-ink">
                        {z.itemCount}
                      </span>{" "}
                      artículos · {z.unitCount} uds.
                    </p>
                    <Link
                      href={`/inventario?zona=${z.id}`}
                      className="inline-flex items-center gap-1 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-gold-deep transition hover:text-gold"
                    >
                      Ver
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ZoneFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initial={formInitial}
      />

      <Modal
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        title="Eliminar zona"
        subtitle={toDelete ? toDelete.name : undefined}
      >
        <p className="text-sm leading-relaxed text-ink-soft">
          Solo puede eliminarse una zona que no contenga artículos. Traslada
          primero su contenido a otra zona.
        </p>
        {deleteError && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">
            {deleteError}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setToDelete(null)} disabled={deleting}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={confirmDelete} disabled={deleting}>
            {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
            Eliminar zona
          </Button>
        </div>
      </Modal>
    </>
  );
}
