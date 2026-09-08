"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, Loader2, PencilLine, Trash2, Undo2 } from "lucide-react";
import type { Item, Zone } from "@/db/schema";
import { STATUSES, STATUS_LABELS } from "@/lib/constants";
import { Button, Modal, inputCls } from "@/components/ui";
import { ItemForm } from "@/components/item-form";
import { secureFetch } from "@/lib/secure-fetch";
import { cn } from "@/lib/utils";

export function ItemActions({ item, zones }: { item: Item; zones: Zone[] }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmCode, setConfirmCode] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function notice(msg: string) {
    setFlash(msg);
    setTimeout(() => setFlash(null), 3500);
  }

  async function changeStatus(status: string) {
    setError(null);
    const res = await secureFetch(`/api/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, version: item.version }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo cambiar el estado.");
      return;
    }
    notice(
      status === "BAJA"
        ? "Artículo dado de baja. Su historial queda conservado."
        : `Estado actualizado: ${STATUS_LABELS[status as never] ?? status}.`,
    );
    startTransition(() => router.refresh());
  }

  async function remove() {
    if (confirmCode.trim().toUpperCase() !== item.code) {
      setError(`Escribe exactamente $${item.code} para confirmar.`.replace("$", ""));
      return;
    }
    setDeleting(true);
    setError(null);
    const res = await secureFetch(`/api/items/${item.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        confirmationCode: confirmCode.trim().toUpperCase(),
        reason: "Eliminado desde la ficha",
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo eliminar.");
      setDeleting(false);
      return;
    }
    router.push("/inventario");
    router.refresh();
  }

  const isBaja = item.status === "BAJA";

  return (
    <div className="rounded-2xl border border-line bg-cream p-4 shadow-card sm:rounded-3xl sm:p-6">
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
                onClick={() => void changeStatus(s)}
                className={cn(
                  "min-h-11 cursor-pointer rounded-xl border px-2.5 py-2 text-[0.7rem] font-semibold transition active:scale-[0.98]",
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

        <div className="flex flex-col gap-2 border-t border-line-soft pt-4 sm:flex-row">
          <Button variant="dark" size="sm" onClick={() => setEditOpen(true)} className="w-full justify-center">
            <PencilLine className="h-3.5 w-3.5" />
            Editar ficha
          </Button>
          {!isBaja ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => void changeStatus("BAJA")}
              className="w-full justify-center"
            >
              <Archive className="h-3.5 w-3.5" />
              Dar de baja
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => void changeStatus("DISPONIBLE")}
              className="w-full justify-center"
            >
              <Undo2 className="h-3.5 w-3.5" />
              Reactivar
            </Button>
          )}
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              setConfirmCode("");
              setError(null);
              setDeleteOpen(true);
            }}
            className="w-full justify-center"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Eliminar
          </Button>
        </div>

        {error && !deleteOpen && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-medium text-red-700">
            {error}
          </p>
        )}
        {flash && (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-700">
            {flash}
          </p>
        )}
      </div>

      <ItemForm open={editOpen} onClose={() => setEditOpen(false)} zones={zones} item={item} />

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Enviar a la papelera"
        subtitle={`${item.code} · Podrás restaurarlo antes del borrado definitivo`}
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm leading-relaxed text-amber-900">
            El artículo pasará a la <strong>papelera</strong>. No se perderá su historial
            y podrás restaurarlo. El borrado definitivo se realiza exclusivamente
            desde la papelera.
          </div>

          <p className="text-sm leading-relaxed text-ink-soft">
            Para mover <strong className="text-ink">{item.name}</strong> a la papelera,
            escribe su código exactamente:
          </p>

          <div>
            <input
              value={confirmCode}
              onChange={(e) => setConfirmCode(e.target.value.toUpperCase())}
              placeholder={item.code}
              autoComplete="off"
              className={cn(inputCls, "text-center font-mono text-base font-bold tracking-[0.2em]")}
            />
            <p className="mt-1.5 text-center text-xs text-ink-faint">
              Escribe <span className="font-mono font-semibold text-ink">{item.code}</span> para habilitar el borrado
            </p>
          </div>

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-medium text-red-700">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => void remove()}
              disabled={deleting || confirmCode.trim().toUpperCase() !== item.code}
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Enviar a la papelera
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
