"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, PencilLine, Trash2 } from "lucide-react";
import type { Item, Zone } from "@/db/schema";
import { STATUSES, STATUS_LABELS } from "@/lib/constants";
import { Button, Modal } from "@/components/ui";
import { ItemForm } from "@/components/item-form";
import { cn } from "@/lib/utils";

export function ItemActions({ item, zones }: { item: Item; zones: Zone[] }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function changeStatus(status: string) {
    setError(null);
    const res = await fetch(`/api/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "No se pudo cambiar el estado.");
      return;
    }
    startTransition(() => router.refresh());
  }

  async function remove() {
    setDeleting(true);
    setError(null);
    const res = await fetch(`/api/items/${item.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "No se pudo eliminar.");
      setDeleting(false);
      return;
    }
    router.push("/inventario");
    router.refresh();
  }

  return (
    <div className="rounded-3xl border border-line bg-cream p-5 shadow-card sm:p-6">
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-ink-soft">
        Gestión del artículo
      </p>

      <div className="mt-4 space-y-3">
        <div>
          <p className="mb-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-ink-faint">
            Cambiar estado
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {STATUSES.map((s) => (
              <button
                key={s}
                disabled={item.status === s}
                onClick={() => changeStatus(s)}
                className={cn(
                  "cursor-pointer rounded-xl border px-2.5 py-2 text-[0.7rem] font-semibold transition",
                  item.status === s
                    ? "cursor-default border-gold bg-gold/10 text-gold-deep"
                    : "border-line bg-white/70 text-ink-soft hover:border-ink/30 hover:text-ink",
                )}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 border-t border-line-soft pt-4">
          <Button variant="dark" size="sm" onClick={() => setEditOpen(true)}>
            <PencilLine className="h-3.5 w-3.5" />
            Editar ficha
          </Button>
          <Button variant="danger" size="sm" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-3.5 w-3.5" />
            Eliminar
          </Button>
        </div>

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-medium text-red-700">
            {error}
          </p>
        )}
      </div>

      <ItemForm
        open={editOpen}
        onClose={() => setEditOpen(false)}
        zones={zones}
        item={item}
      />

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Eliminar artículo"
        subtitle={`${item.code} · Esta acción borra también su historial de movimientos`}
      >
        <p className="text-sm leading-relaxed text-ink-soft">
          ¿Seguro que quieres eliminar{" "}
          <strong className="text-ink">{item.name}</strong> del inventario? Si
          el artículo sigue existiendo pero ya no se usa, considera marcarlo
          como <strong className="text-ink">“Dado de baja”</strong> para
          conservar su historial.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeleteOpen(false)} disabled={deleting}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={remove} disabled={deleting}>
            {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
            Eliminar definitivamente
          </Button>
        </div>
      </Modal>
    </div>
  );
}
