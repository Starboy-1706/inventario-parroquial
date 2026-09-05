"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Download, PackagePlus, Printer, Search } from "lucide-react";
import type { Zone } from "@/db/schema";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";

export function InventoryToolbar({ zones }: { zones: Zone[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const activeZone = searchParams.get("zona");
  const activeType = searchParams.get("tipo") ?? "";
  const activeStatus = searchParams.get("estado") ?? "";

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  // Búsqueda con antirrebote
  useEffect(() => {
    const t = setTimeout(() => {
      if ((searchParams.get("q") ?? "") !== query) setParam("q", query);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-52 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, código o categoría…"
            className="w-full rounded-full border border-line bg-cream py-2.5 pl-10 pr-4 text-sm text-ink shadow-card outline-none transition placeholder:text-ink-faint focus:border-gold focus:ring-2 focus:ring-gold/20"
          />
        </div>
        <select
          value={activeType}
          onChange={(e) => setParam("tipo", e.target.value)}
          className="cursor-pointer rounded-full border border-line bg-cream px-4 py-2.5 text-sm font-medium text-ink shadow-card outline-none transition focus:border-gold"
        >
          <option value="">Todos los tipos</option>
          <option value="UNICO">Piezas únicas</option>
          <option value="CONTABLE">Acumulables</option>
        </select>
        <select
          value={activeStatus}
          onChange={(e) => setParam("estado", e.target.value)}
          className="cursor-pointer rounded-full border border-line bg-cream px-4 py-2.5 text-sm font-medium text-ink shadow-card outline-none transition focus:border-gold"
        >
          <option value="">Cualquier estado</option>
          <option value="DISPONIBLE">En su lugar</option>
          <option value="PRESTADO">Prestado</option>
          <option value="MANTENIMIENTO">Mantenimiento</option>
          <option value="BAJA">Dado de baja</option>
        </select>
        <div className="flex items-center gap-1.5">
          <a
            href="/api/export"
            download
            className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full border border-line bg-cream px-3.5 py-2.5 text-xs font-semibold text-ink shadow-card transition hover:border-ink/30"
            title="Descargar inventario en CSV (compatible con Excel)"
          >
            <Download className="h-3.5 w-3.5 text-gold-deep" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </a>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full border border-line bg-cream px-3.5 py-2.5 text-xs font-semibold text-ink shadow-card transition hover:border-ink/30"
            title="Imprimir listado para auditoría física"
          >
            <Printer className="h-3.5 w-3.5 text-ink-soft" />
            <span className="hidden sm:inline">Imprimir</span>
          </button>
          <Link
            href={activeZone ? `/inventario/nuevo?zona=${activeZone}` : "/inventario/nuevo"}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-cream shadow-card transition hover:bg-ink/85"
          >
            <PackagePlus className="h-4 w-4" />
            Nuevo artículo
          </Link>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          onClick={() => setParam("zona", "")}
          className={cn(
            "shrink-0 cursor-pointer rounded-full border px-4 py-2 text-xs font-semibold transition-all",
            !activeZone
              ? "border-ink bg-ink text-cream"
              : "border-line bg-cream text-ink-soft hover:border-ink/30 hover:text-ink",
          )}
        >
          Todas las zonas
        </button>
        {zones.map((z) => {
          const active = activeZone === String(z.id);
          return (
            <button
              key={z.id}
              onClick={() => setParam("zona", active ? "" : String(z.id))}
              className={cn(
                "flex shrink-0 cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition-all",
                active
                  ? "border-ink bg-ink text-cream"
                  : "border-line bg-cream text-ink-soft hover:border-ink/30 hover:text-ink",
              )}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: z.color }}
              />
              {z.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
