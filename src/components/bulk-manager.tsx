"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckSquare,
  Loader2,
  Printer,
  Square,
} from "lucide-react";
import type { Zone } from "@/db/schema";
import { Button, Field, inputCls } from "@/components/ui";
import { secureFetch } from "@/lib/secure-fetch";

interface BulkItem {
  id: number;
  code: string;
  name: string;
  status: string;
  zoneId: number;
}

export function BulkManager({ items, zones }: { items: BulkItem[]; zones: Zone[] }) {
  const [selected, setSelected] = useState<number[]>([]);
  const [action, setAction] = useState<"STATUS" | "ZONE">("STATUS");
  const [value, setValue] = useState("DISPONIBLE");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function toggle(id: number) {
    setSelected((current) =>
      current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id],
    );
  }

  function selectAll() {
    setSelected((current) => (current.length === items.length ? [] : items.map((item) => item.id)));
  }

  async function run() {
    setPending(true);
    setMessage(null);
    try {
      const response = await secureFetch("/api/items/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: selected,
          action,
          ...(action === "ZONE" ? { zoneId: Number(value) } : { status: value }),
        }),
      });
      const data = await response.json();
      setMessage(response.ok ? `${data.count} artículos actualizados correctamente.` : data.error);
      if (response.ok) setSelected([]);
    } catch {
      setMessage("No se pudo completar la operación.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-5 sm:px-8 sm:py-12">
      <Link href="/inventario" className="inline-flex items-center gap-2 text-xs font-semibold text-ink-soft">
        <ArrowLeft className="h-4 w-4" /> Volver al inventario
      </Link>
      <header className="mt-4">
        <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-gold-deep dark:text-gold-soft">
          Gestión múltiple
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-ink sm:text-4xl">
          Operaciones por lote
        </h1>
        <p className="mt-1 text-xs leading-relaxed text-ink-soft sm:text-sm">
          Selecciona hasta 100 artículos para trasladarlos o cambiar su estado de una vez.
        </p>
      </header>

      <section className="mt-5 rounded-2xl border border-line bg-cream p-4 shadow-card sm:rounded-3xl sm:p-5">
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Field label="Operación">
            <select
              value={action}
              onChange={(event) => {
                const next = event.target.value as "STATUS" | "ZONE";
                setAction(next);
                setValue(next === "ZONE" ? String(zones[0]?.id ?? "") : "DISPONIBLE");
              }}
              className={inputCls}
            >
              <option value="STATUS">Cambiar estado</option>
              <option value="ZONE">Trasladar de zona</option>
            </select>
          </Field>
          <Field label={action === "ZONE" ? "Zona de destino" : "Nuevo estado"}>
            {action === "ZONE" ? (
              <select value={value} onChange={(e) => setValue(e.target.value)} className={inputCls}>
                {zones.map((zone) => (
                  <option key={zone.id} value={zone.id}>{zone.name}</option>
                ))}
              </select>
            ) : (
              <select value={value} onChange={(e) => setValue(e.target.value)} className={inputCls}>
                <option value="DISPONIBLE">En su lugar</option>
                <option value="PRESTADO">Prestado</option>
                <option value="MANTENIMIENTO">Mantenimiento</option>
                <option value="BAJA">Dado de baja</option>
              </select>
            )}
          </Field>
          <Button variant="dark" disabled={!selected.length || pending} onClick={() => void run()} className="w-full sm:w-auto">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckSquare className="h-4 w-4" />}
            Aplicar ({selected.length})
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line-soft pt-3">
          <button onClick={selectAll} className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-line bg-white px-3 text-xs font-semibold text-ink">
            {selected.length === items.length && items.length > 0 ? <CheckSquare className="h-4 w-4 text-gold-deep" /> : <Square className="h-4 w-4" />}
            {selected.length === items.length && items.length > 0 ? "Quitar selección" : "Seleccionar todos"}
          </button>
          <Link
            href={selected.length ? `/inventario/etiquetas?ids=${selected.join(",")}` : "#"}
            className={`inline-flex min-h-10 items-center gap-2 rounded-full border border-line bg-white px-3 text-xs font-semibold ${selected.length ? "text-ink" : "pointer-events-none opacity-40"}`}
          >
            <Printer className="h-4 w-4 text-gold-deep" /> Imprimir etiquetas
          </Link>
        </div>
      </section>

      {message && (
        <p className="mt-3 rounded-xl border border-line bg-cream p-3 text-sm font-semibold text-ink">
          {message}
        </p>
      )}

      <ul className="mt-4 overflow-hidden rounded-2xl border border-line bg-cream shadow-card">
        {items.map((item) => {
          const checked = selected.includes(item.id);
          return (
            <li key={item.id} className="border-t border-line-soft first:border-0">
              <label className="flex min-h-14 cursor-pointer items-center gap-3 px-3 py-2.5 transition active:bg-gold/10 sm:px-4">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(item.id)}
                  className="h-5 w-5 shrink-0 rounded accent-[#A67C2D]"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{item.name}</p>
                  <p className="mt-0.5 font-mono text-[0.64rem] text-ink-faint">{item.code}</p>
                </div>
                <span className="hidden rounded-full bg-paper px-2 py-1 text-[0.62rem] font-semibold text-ink-soft sm:block">
                  {item.status}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
