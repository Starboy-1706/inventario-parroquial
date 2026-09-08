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
    <div className="mx-auto max-w-6xl px-4 py-5 sm:px-8 sm:py-12">
      <header className="animate-fade-up">
        <div className="flex flex-wrap items-end justify-between gap-2.5">
          <div>
            <p className="text-[0.62rem] sm:text-[0.65rem] font-bold uppercase tracking-[0.22em] text-gold-deep dark:text-gold-soft">
              Registro completo
            </p>
            <h1 className="mt-1 font-display text-2xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-ink">
              {activeZone ? (
                <>Zona: <em className="italic text-gold-deep dark:text-gold-soft">{activeZone.name}</em></>
              ) : (
                "Inventario"
              )}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-ink-soft">
              {result.total} artículo{result.total === 1 ? "" : "s"}
              {result.totalPages > 1 && ` · pág. ${result.page}/${result.totalPages}`}
            </p>
          </div>
          <Link
            href="/inventario/papelera"
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-cream px-3 py-1.5 text-xs font-semibold text-ink-soft transition hover:border-red-200 hover:text-red-700 active:scale-95"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Papelera</span>
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
          <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
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
                  className="group min-w-0 overflow-hidden rounded-2xl border border-line bg-cream shadow-card transition-all duration-300 active:scale-[0.985] sm:rounded-3xl sm:hover:-translate-y-1 sm:hover:border-ink/15 sm:hover:shadow-lift"
                >
                  <Link
                    href={`/inventario/${it.id}`}
                    className="grid h-full grid-cols-[7.25rem_minmax(0,1fr)] sm:flex sm:flex-col"
                  >
                    <PhotoFrame
                      src={image}
                      alt={`Fotografía de ${it.name}`}
                      aspect="landscape"
                      imageClassName="group-hover:scale-[1.025]"
                      className="!aspect-auto h-full min-h-[7.25rem] border-r border-line-soft sm:h-auto sm:!aspect-[16/10] sm:border-b sm:border-r-0"
                      overlay={
                        <>
                          <span className="absolute left-2 top-2 rounded-md border border-white/20 bg-ink/80 px-1.5 py-0.5 font-mono text-[0.5rem] font-bold tracking-[0.08em] text-white shadow-sm backdrop-blur-md sm:left-3 sm:top-3 sm:rounded-lg sm:px-2.5 sm:py-1 sm:text-[0.65rem] sm:tracking-[0.12em]">
                            {it.code}
                          </span>
                          <span
                            className="absolute bottom-2 left-2 right-2 truncate rounded-full border border-white/20 px-1.5 py-0.5 text-center text-[0.5rem] font-bold text-white shadow-sm backdrop-blur-md sm:bottom-3 sm:left-3 sm:right-auto sm:max-w-[75%] sm:px-2.5 sm:py-1 sm:text-[0.65rem]"
                            style={{ backgroundColor: `${it.zoneColor}E6` }}
                          >
                            {it.zoneName}
                          </span>
                        </>
                      }
                    />

                    <div className="flex min-w-0 flex-1 flex-col p-3 sm:p-4">
                      <h2 className="line-clamp-2 font-display text-base font-semibold leading-snug tracking-tight text-ink sm:min-h-11 sm:text-lg">
                        {it.name}
                      </h2>
                      <p className="mt-0.5 line-clamp-1 text-[0.68rem] text-ink-soft sm:mt-1 sm:text-xs">
                        {it.category}
                      </p>

                      <div className="mt-4 hidden flex-wrap items-center gap-1.5 sm:flex">
                        <TypeBadge type={it.itemType} />
                        {it.itemType === "UNICO" && <StatusBadge status={it.status} />}
                      </div>

                      <div className="mt-auto flex items-end justify-between gap-2 border-t border-line-soft pt-2.5 sm:pt-4">
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
                          <div className="min-w-0">
                            <span className="sm:hidden"><StatusBadge status={it.status} className="max-w-full truncate" /></span>
                            <p className="hidden text-[0.68rem] font-medium text-ink-faint sm:block">
                              Conservación · {it.condition.toLowerCase()}
                            </p>
                          </div>
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
          <Link aria-disabled={result.page === 1} href={pageHref(sp, Math.max(1, result.page - 1))} className={cn("inline-flex items-center gap-1 rounded-full border border-line bg-cream px-4 py-2 text-xs font-semibold active:scale-95", result.page === 1 && "pointer-events-none opacity-40")}><ChevronLeft className="h-3.5 w-3.5" />Anterior</Link>
          <span className="px-3 text-xs font-medium text-ink-soft">{result.page} / {result.totalPages}</span>
          <Link aria-disabled={result.page === result.totalPages} href={pageHref(sp, Math.min(result.totalPages, result.page + 1))} className={cn("inline-flex items-center gap-1 rounded-full border border-line bg-cream px-4 py-2 text-xs font-semibold active:scale-95", result.page === result.totalPages && "pointer-events-none opacity-40")}>Siguiente<ChevronRight className="h-3.5 w-3.5" /></Link>
        </nav>
      )}

    </div>
  );
}
