"use client";

import { secureFetch } from "@/lib/secure-fetch";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck, Loader2, Minus, Plus } from "lucide-react";
import { Button, inputCls } from "@/components/ui";
import { cn } from "@/lib/utils";

export function StockAdjuster({
  itemId,
  quantity,
  minQuantity,
}: {
  itemId: number;
  quantity: number;
  minQuantity: number;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState(1);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const lowStock = minQuantity > 0 && quantity <= minQuantity;

  async function adjust(body: Record<string, unknown>, okMsg: string) {
    setPending(true);
    setError(null);
    setFlash(null);
    try {
      const res = await secureFetch(`/api/items/${itemId}/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo ajustar el stock.");
        return;
      }
      setFlash(okMsg);
      setNote("");
      router.refresh();
      setTimeout(() => setFlash(null), 3000);
    } catch {
      setError("Error de conexión.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className={cn(
        "rounded-2xl border p-4 shadow-card sm:rounded-3xl sm:p-6",
        lowStock ? "border-red-200 bg-red-50/50" : "border-line bg-cream",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-ink-soft">
            Existencias actuales
          </p>
          <p className="mt-1 font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
            {quantity}
            <span className="ml-2 align-middle font-sans text-xs font-medium uppercase tracking-widest text-ink-faint">
              uds.
            </span>
          </p>
          {minQuantity > 0 && (
            <p
              className={cn(
                "mt-1 text-xs font-semibold",
                lowStock ? "text-red-700" : "text-ink-soft",
              )}
            >
              Mínimo recomendado: {minQuantity}
              {lowStock && " · ¡Reponer cuanto antes!"}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            disabled={pending || quantity === 0}
            onClick={() => adjust({ delta: -1, note: note || undefined }, "-1 unidad registrada")}
            className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border border-line bg-white text-ink shadow-sm transition active:scale-90 hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:opacity-40"
            aria-label="Retirar una unidad"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            disabled={pending}
            onClick={() => adjust({ delta: 1, note: note || undefined }, "+1 unidad registrada")}
            className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border border-line bg-white text-ink shadow-sm transition active:scale-90 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-40"
            aria-label="Añadir una unidad"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-5 border-t border-line-soft pt-4">
        <div className="flex flex-wrap items-end gap-2.5">
          <label className="block">
            <span className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-ink-soft">
              Cantidad
            </span>
            <input
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
              className={cn(inputCls, "w-24 text-center font-mono font-semibold")}
            />
          </label>
          <label className="block min-w-48 flex-1">
            <span className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-ink-soft">
              Nota (opcional)
            </span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ej. Compra mensual, misa dominical…"
              className={inputCls}
            />
          </label>
          <div className="flex flex-wrap gap-2 w-full">
            <Button
              size="md"
              variant="outline"
              disabled={pending}
              onClick={() =>
                adjust({ delta: amount, note: note || undefined }, `+${amount} unidades registradas`)
              }
              className="flex-1 min-w-[80px]"
            >
              Añadir
            </Button>
            <Button
              size="md"
              variant="outline"
              disabled={pending || quantity === 0}
              onClick={() =>
                adjust({ delta: -amount, note: note || undefined }, `-${amount} unidades registradas`)
              }
              className="flex-1 min-w-[80px]"
            >
              Retirar
            </Button>
            <Button
              size="md"
              variant="dark"
              disabled={pending}
              onClick={() =>
                adjust({ set: amount, note: note || undefined }, `Recuento fijado en ${amount}`)
              }
              title="Fijar como recuento físico exacto"
              className="w-full sm:w-auto sm:flex-1"
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ClipboardCheck className="h-4 w-4" />
              )}
              Recuento exacto
            </Button>
          </div>
        </div>

        {error && (
          <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-medium text-red-700">
            {error}
          </p>
        )}
        {flash && (
          <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-700">
            {flash}
          </p>
        )}
      </div>
    </div>
  );
}
