"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ChevronDown,
  Download,
  FileUp,
  ListChecks,
  PackagePlus,
  Printer,
  Search,
} from "lucide-react";
import type { Zone } from "@/db/schema";
import { cn } from "@/lib/utils";

export function InventoryToolbar({ zones }: { zones: Zone[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [moreOpen, setMoreOpen] = useState(false);

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const activeZone = searchParams.get("zona");
  const activeType = searchParams.get("tipo") ?? "";
  const activeStatus = searchParams.get("estado") ?? "";

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("pagina");
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  useEffect(() => {
    const t = setTimeout(() => {
      if ((searchParams.get("q") ?? "") !== query) setParam("q", query);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div className="space-y-3">
      {/* ---- Fila 1: Búsqueda (anchura completa) ---- */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre, código o categoría…"
          className="w-full rounded-full border border-line bg-cream py-2.5 pl-10 pr-4 text-sm text-ink shadow-card outline-none transition placeholder:text-ink-faint focus:border-gold focus:ring-2 focus:ring-gold/20"
        />
      </div>

      {/* ---- Fila 2: Filtros + Acción principal ---- */}
      <div className="flex items-center gap-2">
        <select
          value={activeType}
          onChange={(e) => setParam("tipo", e.target.value)}
          className="min-w-0 flex-1 cursor-pointer rounded-full border border-line bg-cream px-3 py-2.5 text-xs font-medium text-ink shadow-card outline-none transition focus:border-gold"
        >
          <option value="">Tipo</option>
          <option value="UNICO">Únicas</option>
          <option value="CONTABLE">Acumulables</option>
        </select>
        <select
          value={activeStatus}
          onChange={(e) => setParam("estado", e.target.value)}
          className="min-w-0 flex-1 cursor-pointer rounded-full border border-line bg-cream px-3 py-2.5 text-xs font-medium text-ink shadow-card outline-none transition focus:border-gold"
        >
          <option value="">Estado</option>
          <option value="DISPONIBLE">En su lugar</option>
          <option value="PRESTADO">Prestado</option>
          <option value="MANTENIMIENTO">Mantenim.</option>
          <option value="BAJA">Baja</option>
        </select>

        {/* Botón principal: siempre visible */}
        <Link
          href={activeZone ? `/inventario/nuevo?zona=${activeZone}` : "/inventario/nuevo"}
          className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-ink px-4 py-2.5 text-xs font-bold text-cream shadow-card transition hover:bg-ink/85"
        >
          <PackagePlus className="h-4 w-4 text-gold-soft" />
          <span className="hidden sm:inline">Nuevo artículo</span>
          <span className="sm:hidden">Nuevo</span>
        </Link>

        {/* Menú colapsable de acciones secundarias */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            className={cn(
              "flex cursor-pointer items-center gap-1 rounded-full border border-line bg-cream px-3 py-2.5 text-xs font-semibold text-ink-soft shadow-card transition",
              moreOpen && "border-gold/40 bg-gold/10 text-gold-deep",
            )}
            aria-label="Más acciones"
          >
            <ChevronDown
              className={cn("h-4 w-4 transition-transform", moreOpen && "rotate-180")}
            />
          </button>
          {moreOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMoreOpen(false)}
              />
              <div className="absolute right-0 top-full z-20 mt-2 w-52 overflow-hidden rounded-2xl border border-line bg-cream shadow-lift">
                <a
                  href="/api/export"
                  download
                  className="flex items-center gap-2.5 px-4 py-3 text-xs font-semibold text-ink transition hover:bg-gold/10"
                >
                  <Download className="h-4 w-4 text-gold-deep" />
                  Exportar CSV (Excel)
                </a>
                <Link
                  href="/inventario/importar"
                  className="flex items-center gap-2.5 border-t border-line-soft px-4 py-3 text-xs font-semibold text-ink transition hover:bg-gold/10"
                >
                  <FileUp className="h-4 w-4 text-gold-deep" />
                  Importar desde Excel
                </Link>
                <Link
                  href="/inventario/lotes"
                  className="flex items-center gap-2.5 border-t border-line-soft px-4 py-3 text-xs font-semibold text-ink transition hover:bg-gold/10"
                >
                  <ListChecks className="h-4 w-4 text-gold-deep" />
                  Operaciones por lote
                </Link>
                <Link
                  href="/inventario/papelera"
                  className="flex items-center gap-2.5 border-t border-line-soft px-4 py-3 text-xs font-semibold text-ink transition hover:bg-gold/10"
                >
                  <Printer className="h-4 w-4 text-gold-deep" />
                  Papelera de reciclaje
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMoreOpen(false);
                    window.print();
                  }}
                  className="flex w-full cursor-pointer items-center gap-2.5 border-t border-line-soft px-4 py-3 text-xs font-semibold text-ink transition hover:bg-gold/10"
                >
                  <Printer className="h-4 w-4 text-gold-deep" />
                  Imprimir listado actual
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ---- Fila 3: Chips de zona (scrollable) ---- */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          onClick={() => setParam("zona", "")}
          className={cn(
            "shrink-0 cursor-pointer rounded-full border px-3.5 py-1.5 text-[0.7rem] font-semibold transition-all",
            !activeZone
              ? "border-ink bg-ink text-cream"
              : "border-line bg-cream text-ink-soft hover:border-ink/30 hover:text-ink",
          )}
        >
          Todas
        </button>
        {zones.map((z) => {
          const active = activeZone === String(z.id);
          return (
            <button
              key={z.id}
              onClick={() => setParam("zona", active ? "" : String(z.id))}
              className={cn(
                "flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[0.7rem] font-semibold transition-all",
                active
                  ? "border-ink bg-ink text-cream"
                  : "border-line bg-cream text-ink-soft hover:border-ink/30 hover:text-ink",
              )}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: z.color }} />
              {z.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
