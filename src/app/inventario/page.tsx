import Link from "next/link";
import { asc } from "drizzle-orm";
import { Boxes, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { db } from "@/db";
import { zones } from "@/db/schema";
import { getItemsPage } from "@/lib/queries";
import { StatusBadge, TypeBadge } from "@/components/ui";
import { EmptyState } from "@/components/empty-state";
import { InventoryToolbar } from "@/components/inventory-toolbar";
import { PhotoFrame } from "@/components/photo-frame";
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
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {result.data.map((it) => {
              const lowStock =
                it.itemType === "CONTABLE" &&
                it.minQuantity > 0 &&
                it.quantity <= it.minQuantity;
              const image = it.photoId
                ? `${photoUrl(it.photoId)}?thumb=1`
                : null;

              return (
                <li
                  key={it.id}
                  className="group min-w-0 overflow-hidden rounded-3xl border border-line bg-cream shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-ink/15 hover:shadow-lift"
                >
                  <Link href={`/inventario/${it.id}`} className="flex h-full flex-col">
                    <PhotoFrame
                      src={image}
                      alt={`Fotografía de ${it.name}`}
                      aspect="landscape"
                      imageClassName="group-hover:scale-[1.025]"
                      className="border-b border-line-soft"
                      overlay={
                        <>
                          <span className="absolute left-3 top-3 rounded-lg border border-white/20 bg-ink/75 px-2.5 py-1 font-mono text-[0.65rem] font-bold tracking-[0.12em] text-white shadow-sm backdrop-blur-md">
                            {it.code}
                          </span>
                          <span
                            className="absolute bottom-3 left-3 max-w-[75%] truncate rounded-full border border-white/20 px-2.5 py-1 text-[0.65rem] font-bold text-white shadow-sm backdrop-blur-md"
                            style={{ backgroundColor: `${it.zoneColor}E6` }}
                          >
                            {it.zoneName}
                          </span>
                        </>
                      }
                    />

                    <div className="flex flex-1 flex-col p-4">
                      <h2 className="line-clamp-2 min-h-11 font-display text-lg font-semibold leading-snug tracking-tight text-ink">
                        {it.name}
                      </h2>
                      <p className="mt-1 line-clamp-1 text-xs text-ink-soft">
                        {it.category}
                      </p>

                      <div className="mt-4 flex flex-wrap items-center gap-1.5">
                        <TypeBadge type={it.itemType} />
                        {it.itemType === "UNICO" && (
                          <StatusBadge status={it.status} />
                        )}
                      </div>

                      <div className="mt-auto flex items-end justify-between gap-3 border-t border-line-soft pt-4">
                        {it.itemType === "CONTABLE" ? (
                          <div>
                            <p
                              className={cn(
                                "font-display text-2xl font-semibold leading-none",
                                lowStock ? "text-red-700" : "text-ink",
                              )}
                            >
                              {it.quantity}{" "}
                              <span className="font-sans text-[0.65rem] font-medium uppercase tracking-wider text-ink-faint">
                                uds.
                              </span>
                            </p>
                            <p
                              className={cn(
                                "mt-1 text-[0.62rem] font-semibold",
                                lowStock ? "text-red-600" : "text-ink-faint",
                              )}
                            >
                              {lowStock
                                ? `Stock bajo · mínimo ${it.minQuantity}`
                                : `Mínimo ${it.minQuantity}`}
                            </p>
                          </div>
                        ) : (
                          <p className="text-[0.68rem] font-medium text-ink-faint">
                            Conservación · {it.condition.toLowerCase()}
                          </p>
                        )}
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-white text-ink-faint transition-all group-hover:border-gold/40 group-hover:bg-gold/10 group-hover:text-gold-deep">
                          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </span>
                      </div>
                    </div>
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
