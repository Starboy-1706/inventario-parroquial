"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, PencilLine, Trash2, Undo2 } from "lucide-react";
import type { Item, Zone } from "@/db/schema";
import { STATUSES, STATUS_LABELS } from "@/lib/constants";
import { secureFetch } from "@/lib/secure-fetch";
import { cn } from "@/lib/utils";

export function ItemActions({ item, zones }: { item: Item; zones: Zone[] }) {
  void zones; // la edición se realiza en su propia página completa
  const router = useRouter();
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
          <Link
            href={`/inventario/${item.id}/editar`}
            className="inline-flex min-h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-ink px-3.5 py-1.5 text-xs font-semibold text-cream transition-all duration-200 hover:bg-ink/85 active:scale-[0.97]"
          >
            <PencilLine className="h-3.5 w-3.5" />
            Editar ficha
          </Link>
          {!isBaja ? (
            <button
              onClick={() => void changeStatus("BAJA")}
              className="inline-flex min-h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-line bg-cream px-3.5 py-1.5 text-xs font-semibold text-ink transition-all duration-200 hover:border-ink/25 active:scale-[0.97]"
            >
              <Archive className="h-3.5 w-3.5" />
              Dar de baja
            </button>
          ) : (
            <button
              onClick={() => void changeStatus("DISPONIBLE")}
              className="inline-flex min-h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-line bg-cream px-3.5 py-1.5 text-xs font-semibold text-ink transition-all duration-200 hover:border-ink/25 active:scale-[0.97]"
            >
              <Undo2 className="h-3.5 w-3.5" />
              Reactivar
            </button>
          )}
          <Link
            href={`/inventario/${item.id}/eliminar`}
            className="inline-flex min-h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-red-200 bg-red-50 px-3.5 py-1.5 text-xs font-semibold text-red-700 transition-all duration-200 hover:bg-red-100 active:scale-[0.97]"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Eliminar
          </Link>
        </div>

        {error && (
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
    </div>
  );
}
