import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import {
  ArrowLeft,
  ArrowUpRight,
  Boxes,
  MapPinned,
  PencilLine,
  QrCode,
  Ruler,
} from "lucide-react";
import { db } from "@/db";
import { items, storageLocations, zones } from "@/db/schema";
import { StatusBadge, TypeBadge, ZoneIcon } from "@/components/ui";
import { PhotoFrame } from "@/components/photo-frame";
import { authPageMetadata, requireAuthenticated } from "@/lib/auth";
import {
  LOCATION_KIND_ICONS,
  LOCATION_KIND_LABELS,
  type LocationKind,
} from "@/lib/constants";
import {
  formatItemDimensions,
  formatZoneDimensions,
  photoUrl,
  zoneAreaM2,
} from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return authPageMetadata("Detalle de zona");
}

export default async function ZonaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuthenticated();
  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const [zone] = await db.select().from(zones).where(eq(zones.id, id));
  if (!zone) notFound();

  const [locations, zoneItems] = await Promise.all([
    db
      .select({
        id: storageLocations.id,
        parentId: storageLocations.parentId,
        name: storageLocations.name,
        kind: storageLocations.kind,
        itemCount: sql<number>`(
          select count(*)::int from ${items}
          where ${items.locationId} = ${storageLocations.id}
            and ${items.deletedAt} is null
        )`,
      })
      .from(storageLocations)
      .where(eq(storageLocations.zoneId, id))
      .orderBy(asc(storageLocations.name)),
    db
      .select()
      .from(items)
      .where(and(eq(items.zoneId, id), isNull(items.deletedAt)))
      .orderBy(asc(items.name)),
  ]);

  const dims = formatZoneDimensions(zone);
  const area = zoneAreaM2(zone);
  const units = zoneItems.reduce((sum, it) => sum + it.quantity, 0);
  const roots = locations.filter((l) => l.parentId === null);
  const childrenOf = (parent: number) =>
    locations.filter((l) => l.parentId === parent);

  return (
    <div className="mx-auto max-w-6xl px-4 py-5 sm:px-8 sm:py-12">
      <Link
        href="/zonas"
        className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft transition hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver a zonas
      </Link>

      {/* ---------- Cabecera ---------- */}
      <header className="mt-4 animate-fade-up">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <ZoneIcon icon={zone.icon} color={zone.color} size="lg" />
            <div>
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-gold-deep">
                Zona de la parroquia
              </p>
              <h1 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-4xl lg:text-5xl">
                {zone.name}
              </h1>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/zonas/${zone.id}/ubicaciones`}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-cream px-3.5 py-2 text-xs font-bold text-ink transition hover:border-gold/40 hover:text-gold-deep"
            >
              <MapPinned className="h-3.5 w-3.5 text-gold-deep" />
              Ubicaciones
            </Link>
            <Link
              href={`/zonas/${zone.id}/editar`}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-cream px-3.5 py-2 text-xs font-bold text-ink transition hover:border-gold/40 hover:text-gold-deep"
            >
              <PencilLine className="h-3.5 w-3.5 text-gold-deep" />
              Editar zona
            </Link>
            {zoneItems.length > 0 && (
              <Link
                href={`/zonas/${zone.id}/etiquetas`}
                className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-2 text-xs font-bold text-cream transition hover:bg-ink/85"
              >
                <QrCode className="h-3.5 w-3.5 text-gold-soft" />
                Etiquetas QR
              </Link>
            )}
          </div>
        </div>

        {/* Descripción de la zona, siempre visible */}
        {zone.description && (
          <div className="mt-4 max-w-3xl rounded-2xl border border-line bg-cream/80 px-4 py-3">
            <p className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-gold-deep">
              Descripción
            </p>
            <p className="mt-1 text-sm leading-relaxed text-ink sm:text-[0.95rem]">
              {zone.description}
            </p>
          </div>
        )}
      </header>

      <div className="mt-6 grid gap-4 sm:gap-6 lg:grid-cols-[1fr_1.4fr]">
        {/* ---------- Columna izquierda: foto + datos ---------- */}
        <div className="space-y-4 sm:space-y-6">
          {zone.photoId && (
            <PhotoFrame
              src={photoUrl(zone.photoId)}
              alt={`Fotografía de ${zone.name}`}
              aspect="landscape"
              className="animate-fade-up overflow-hidden rounded-3xl border border-line shadow-card"
            />
          )}

          <section className="animate-fade-up rounded-2xl border border-line bg-cream p-4 shadow-card sm:rounded-3xl sm:p-6">
            <h2 className="font-display text-lg font-semibold tracking-tight text-ink">
              Datos del área
            </h2>
            <dl className="mt-3 space-y-2.5">
              <div className="flex items-center justify-between gap-3 border-b border-line-soft pb-2.5">
                <dt className="flex items-center gap-1.5 text-[0.66rem] font-semibold uppercase tracking-[0.1em] text-ink-faint">
                  <Ruler className="h-3.5 w-3.5" />
                  Medidas
                </dt>
                <dd className="text-sm font-medium text-ink">
                  {dims ?? <span className="italic text-ink-faint">Sin registrar</span>}
                </dd>
              </div>
              {area && (
                <div className="flex items-center justify-between gap-3 border-b border-line-soft pb-2.5">
                  <dt className="text-[0.66rem] font-semibold uppercase tracking-[0.1em] text-ink-faint">
                    Superficie
                  </dt>
                  <dd className="text-sm font-bold text-gold-deep">{area} m²</dd>
                </div>
              )}
              <div className="flex items-center justify-between gap-3 border-b border-line-soft pb-2.5">
                <dt className="flex items-center gap-1.5 text-[0.66rem] font-semibold uppercase tracking-[0.1em] text-ink-faint">
                  <Boxes className="h-3.5 w-3.5" />
                  Artículos
                </dt>
                <dd className="text-sm font-medium text-ink">
                  {zoneItems.length} fichas · {units} uds.
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-1.5 text-[0.66rem] font-semibold uppercase tracking-[0.1em] text-ink-faint">
                  <MapPinned className="h-3.5 w-3.5" />
                  Ubicaciones
                </dt>
                <dd className="text-sm font-medium text-ink">{locations.length}</dd>
              </div>
            </dl>
          </section>

          {/* ---------- Árbol de ubicaciones ---------- */}
          <section className="animate-fade-up rounded-2xl border border-line bg-cream p-4 shadow-card sm:rounded-3xl sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-lg font-semibold tracking-tight text-ink">
                Dónde se guarda
              </h2>
              <Link
                href={`/zonas/${zone.id}/ubicaciones`}
                className="text-[0.68rem] font-bold uppercase tracking-[0.1em] text-gold-deep"
              >
                Gestionar
              </Link>
            </div>
            {locations.length === 0 ? (
              <p className="mt-3 rounded-2xl border border-dashed border-line px-4 py-5 text-center text-xs text-ink-soft">
                Sin armarios ni archiveros definidos todavía.
              </p>
            ) : (
              <ul className="mt-3 space-y-1.5">
                {roots.map((loc) => (
                  <li key={loc.id}>
                    <div className="flex items-center gap-2 rounded-xl bg-white/60 px-3 py-2">
                      <span>{LOCATION_KIND_ICONS[loc.kind as LocationKind] ?? "📍"}</span>
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
                        {loc.name}
                      </span>
                      <span className="shrink-0 text-[0.65rem] text-ink-soft">
                        {LOCATION_KIND_LABELS[loc.kind as LocationKind] ?? "Otro"}
                        {loc.itemCount > 0 && ` · ${loc.itemCount}`}
                      </span>
                    </div>
                    {childrenOf(loc.id).length > 0 && (
                      <ul className="ml-5 mt-1 space-y-1 border-l border-line pl-3">
                        {childrenOf(loc.id).map((child) => (
                          <li
                            key={child.id}
                            className="flex items-center gap-2 text-xs text-ink-soft"
                          >
                            <span>
                              {LOCATION_KIND_ICONS[child.kind as LocationKind] ?? "📍"}
                            </span>
                            <span className="min-w-0 flex-1 truncate font-medium text-ink">
                              {child.name}
                            </span>
                            {child.itemCount > 0 && (
                              <span className="shrink-0">{child.itemCount}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* ---------- Columna derecha: artículos ---------- */}
        <section className="animate-fade-up">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-xl font-semibold tracking-tight text-ink">
              Artículos de la zona
            </h2>
            <Link
              href={`/inventario?zona=${zone.id}`}
              className="inline-flex items-center gap-1 text-[0.68rem] font-bold uppercase tracking-[0.1em] text-gold-deep"
            >
              Ver en inventario
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {zoneItems.length === 0 ? (
            <div className="mt-3 rounded-3xl border border-dashed border-line bg-cream/70 p-10 text-center">
              <Boxes className="mx-auto h-8 w-8 text-ink-faint" />
              <p className="mt-2 font-semibold text-ink">Aún no hay artículos aquí</p>
              <Link
                href={`/inventario/nuevo?zona=${zone.id}`}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-xs font-semibold text-cream"
              >
                Dar de alta el primero
              </Link>
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-line-soft overflow-hidden rounded-3xl border border-line bg-cream shadow-card">
              {zoneItems.map((it) => {
                const itDims = formatItemDimensions(it);
                const spec = [it.brand, it.model].filter(Boolean).join(" · ");
                return (
                  <li key={it.id}>
                    <Link
                      href={`/inventario/${it.id}`}
                      className="flex gap-3 p-3.5 transition hover:bg-paper/60 sm:p-4"
                    >
                      <PhotoFrame
                        src={it.photoId ? `${photoUrl(it.photoId)}?thumb=1` : null}
                        alt=""
                        aspect="standard"
                        className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-line-soft !aspect-auto"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display text-base font-semibold text-ink">
                          {it.name}
                        </p>
                        <p className="mt-0.5 font-mono text-[0.65rem] font-bold tracking-wider text-gold-deep">
                          {it.code}
                        </p>
                        {spec && (
                          <p className="mt-0.5 truncate text-[0.7rem] font-medium text-ink-soft">
                            {spec}
                          </p>
                        )}
                        {it.description && (
                          <p className="mt-0.5 line-clamp-2 text-[0.72rem] leading-snug text-ink-soft/90">
                            {it.description}
                          </p>
                        )}
                        {itDims && (
                          <p className="mt-0.5 font-mono text-[0.62rem] text-ink-faint">
                            {itDims}
                          </p>
                        )}
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <TypeBadge type={it.itemType} />
                          <StatusBadge status={it.status} />
                          {it.itemType === "CONTABLE" && (
                            <span className="rounded-full bg-ink/5 px-2 py-0.5 font-mono text-[0.62rem] font-bold text-ink-soft">
                              {it.quantity} uds.
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
