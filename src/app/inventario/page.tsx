import Link from "next/link";
import { asc } from "drizzle-orm";
import { Boxes, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { db } from "@/db";
import { zones } from "@/db/schema";
import { getItemsPage } from "@/lib/queries";
import { StatusBadge, TypeBadge } from "@/components/ui";
import { EmptyState } from "@/components/empty-state";
import { InventoryToolbar } from "@/components/inventory-toolbar";
import { authPageMetadata, requireAuthenticated } from "@/lib/auth";
import { cn, photoUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";
export async function generateMetadata() { return authPageMetadata("Inventario"); }

type SearchParams = Promise<{
  zona?: string; tipo?: string; estado?: string; q?: string; pagina?: string;
}>;

function pageHref(sp: Awaited<SearchParams>, page: number) {
  const params = new URLSearchParams();
  if (sp.zona) params.set("zona", sp.zona);
  if (sp.tipo) params.set("tipo", sp.tipo);
  if (sp.estado) params.set("estado", sp.estado);
  if (sp.q) params.set("q", sp.q);
  params.set("pagina", String(page));
  return `/inventario?${params}`;
}

export default async function InventarioPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAuthenticated();
  const sp = await searchParams;
  const [allZones, result] = await Promise.all([
    db.select().from(zones).orderBy(asc(zones.name)),
    getItemsPage({
      zoneId: sp.zona ? Number(sp.zona) : undefined,
      type: sp.tipo,
      status: sp.estado,
      search: sp.q,
      page: Number(sp.pagina) || 1,
      pageSize: 25,
    }),
  ]);
  const activeZone = sp.zona ? allZones.find((z) => z.id === Number(sp.zona)) : undefined;

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-12">
      <header className="animate-fade-up">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-gold">Registro completo</p>
            <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
              {activeZone ? <>Zona: <em className="italic text-gold-deep">{activeZone.name}</em></> : "Inventario"}
            </h1>
            <p className="mt-2 text-sm text-ink-soft">
              {result.total} artículo{result.total === 1 ? "" : "s"} · página {result.page} de {result.totalPages}
            </p>
          </div>
          <Link href="/inventario/papelera" className="inline-flex items-center gap-2 rounded-full border border-line bg-cream px-4 py-2 text-xs font-semibold text-ink-soft transition hover:border-red-200 hover:text-red-700">
            <Trash2 className="h-3.5 w-3.5" /> Papelera
          </Link>
        </div>
      </header>

      <div className="mt-7 animate-fade-up" style={{ animationDelay: "120ms" }}>
        <InventoryToolbar zones={allZones} />
      </div>

      <section className="mt-6 animate-fade-up" style={{ animationDelay: "200ms" }}>
        {result.data.length === 0 ? (
          <EmptyState icon={Boxes} title="Sin resultados" description="No hay artículos que coincidan. Quita filtros o da de alta uno nuevo." />
        ) : (
          <ul className="overflow-hidden rounded-2xl border border-line bg-cream shadow-card">
            {result.data.map((it, i) => {
              const lowStock = it.itemType === "CONTABLE" && it.minQuantity > 0 && it.quantity <= it.minQuantity;
              return (
                <li key={it.id} className={cn(i !== 0 && "border-t border-line-soft")}>
                  <Link href={`/inventario/${it.id}`} className="group relative flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-paper/60 sm:gap-5 sm:px-5">
                    <span className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: it.zoneColor }} />
                    {it.photoId && (
                      <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-line sm:h-12 sm:w-12">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`${photoUrl(it.photoId)}?thumb=1`} alt="" className="h-full w-full object-cover" />
                      </span>
                    )}
                    <span className="hidden shrink-0 rounded-lg border border-line bg-white px-2.5 py-1.5 font-mono text-[0.7rem] font-semibold tracking-wide text-ink-soft sm:block">{it.code}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink sm:text-[0.95rem]">{it.name}</p>
                      <p className="mt-0.5 truncate text-xs text-ink-soft">
                        <span className="font-mono text-[0.68rem] sm:hidden">{it.code} · </span>
                        {it.zoneName}<span className="mx-1.5 text-ink-faint">·</span>{it.category}
                      </p>
                    </div>
                    <div className="hidden shrink-0 md:block"><TypeBadge type={it.itemType} /></div>
                    <div className="shrink-0 text-right">
                      {it.itemType === "CONTABLE" ? (
                        <><p className={cn("font-display text-lg font-semibold leading-none", lowStock ? "text-red-700" : "text-ink")}>{it.quantity} <span className="font-sans text-[0.65rem] font-medium text-ink-faint">uds.</span></p>{lowStock && <p className="mt-1 text-[0.62rem] font-bold uppercase tracking-wide text-red-600">stock bajo</p>}</>
                      ) : <StatusBadge status={it.status} />}
                    </div>
                    <ChevronRight className="hidden h-4 w-4 shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5 sm:block" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {result.totalPages > 1 && (
        <nav className="mt-6 flex items-center justify-center gap-2" aria-label="Paginación">
          <Link aria-disabled={result.page === 1} href={pageHref(sp, Math.max(1, result.page - 1))} className={cn("inline-flex items-center gap-1 rounded-full border border-line bg-cream px-4 py-2 text-xs font-semibold", result.page === 1 && "pointer-events-none opacity-40")}><ChevronLeft className="h-3.5 w-3.5" />Anterior</Link>
          <span className="px-3 text-xs font-medium text-ink-soft">{result.page} / {result.totalPages}</span>
          <Link aria-disabled={result.page === result.totalPages} href={pageHref(sp, Math.min(result.totalPages, result.page + 1))} className={cn("inline-flex items-center gap-1 rounded-full border border-line bg-cream px-4 py-2 text-xs font-semibold", result.page === result.totalPages && "pointer-events-none opacity-40")}>Siguiente<ChevronRight className="h-3.5 w-3.5" /></Link>
        </nav>
      )}
    </div>
  );
}
