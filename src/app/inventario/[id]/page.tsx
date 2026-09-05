import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq, desc, and, isNull } from "drizzle-orm";
import { ArrowLeft, Calendar, Coins, Layers, MapPin, ScrollText, Tag } from "lucide-react";
import { db } from "@/db";
import { itemPhotos, items, loans, maintenanceRecords, movements, storageLocations, zones } from "@/db/schema";
import {
  ConditionBadge,
  StatusBadge,
  TypeBadge,
  ZoneIcon,
} from "@/components/ui";
import { MovementIcon } from "@/components/movement-icon";
import { QrLabel } from "@/components/qr-label";
import { StockAdjuster } from "@/components/stock-adjuster";
import { ItemActions } from "@/components/item-actions";
import { ItemCarePanel } from "@/components/item-care-panel";
import { PhotoFrame } from "@/components/photo-frame";
import { MOVEMENT_LABELS, type MovementType } from "@/lib/constants";
import { authPageMetadata, requireAuthenticated } from "@/lib/auth";
import { cn, formatDate, formatDateTime, formatMoney, photoUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return authPageMetadata("Artículo");
}

type Props = { params: Promise<{ id: string }> };

export default async function ItemDetailPage({ params }: Props) {
  await requireAuthenticated();
  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const [row] = await db
    .select({ item: items, zone: zones, location: storageLocations })
    .from(items)
    .innerJoin(zones, eq(items.zoneId, zones.id))
    .leftJoin(storageLocations, eq(items.locationId, storageLocations.id))
    .where(and(eq(items.id, id), isNull(items.deletedAt)));
  if (!row) notFound();

  const [history, allZones, loanRows, maintenanceRows, gallery] = await Promise.all([
    db
      .select()
      .from(movements)
      .where(eq(movements.itemId, id))
      .orderBy(desc(movements.createdAt)),
    db.select().from(zones).orderBy(asc(zones.name)),
    db.select().from(loans).where(eq(loans.itemId, id)).orderBy(desc(loans.lentAt)),
    db.select().from(maintenanceRecords).where(eq(maintenanceRecords.itemId, id)).orderBy(desc(maintenanceRecords.startedAt)),
    db.select({ photoId: itemPhotos.photoId }).from(itemPhotos).where(eq(itemPhotos.itemId, id)).orderBy(asc(itemPhotos.sortOrder)),
  ]);

  const { item, zone } = row;
  const galleryIds = gallery.length
    ? gallery.map((p) => p.photoId)
    : item.photoId
      ? [item.photoId]
      : [];

  const meta = [
    { icon: Tag, label: "Categoría", value: item.category },
    {
      icon: MapPin,
      label: "Zona y lugar exacto",
      value: (() => {
        const parts: string[] = [zone.name];
        if (row.location) parts.push(row.location.name);
        if (item.locationNote) parts.push(`exactitud: ${item.locationNote}`);
        return parts.join(" · ");
      })(),
    },
    {
      icon: Calendar,
      label: "Adquisición",
      value: formatDate(item.acquisitionDate),
    },
    {
      icon: Coins,
      label: "Valor estimado",
      value: formatMoney(item.estimatedValue),
    },
    {
      icon: Layers,
      label: "Alta en inventario",
      value: formatDate(item.createdAt),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-12">
      <Link
        href={`/inventario?zona=${zone.id}`}
        className="no-print inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft transition hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver a {zone.name}
      </Link>

      {/* ---------- Cabecera de ficha ---------- */}
      <header className="no-print mt-5 animate-fade-up">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="rounded-lg border border-line bg-white px-3 py-1.5 font-mono text-sm font-bold tracking-[0.18em] text-ink">
            {item.code}
          </span>
          <TypeBadge type={item.itemType} />
          <StatusBadge status={item.status} />
          <ConditionBadge condition={item.condition} />
        </div>
        <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-5xl">
          {item.name}
        </h1>
        {item.description && (
          <p className="mt-3 max-w-2xl text-[0.95rem] leading-relaxed text-ink-soft">
            {item.description}
          </p>
        )}
      </header>

      <div className="no-print mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* ---------- Columna principal ---------- */}
        <div className="space-y-6">
          <section
            className="animate-fade-up rounded-3xl border border-line bg-cream p-5 shadow-card sm:p-6"
            style={{ animationDelay: "100ms" }}
          >
            <div className="flex items-center gap-3">
              <ZoneIcon icon={zone.icon} color={zone.color} />
              <div>
                <p className="text-sm font-bold text-ink">{zone.name}</p>
                <p className="text-xs text-ink-soft">{zone.description}</p>
              </div>
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-line-soft pt-5 sm:grid-cols-3">
              {meta.map((m) => (
                <div key={m.label}>
                  <dt className="flex items-center gap-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                    <m.icon className="h-3 w-3" />
                    {m.label}
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-ink">{m.value}</dd>
                </div>
              ))}
            </dl>
            {item.notes && (
              <div className="mt-5 rounded-2xl border border-gold/25 bg-gold/8 px-4 py-3">
                <p className="flex items-center gap-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-gold-deep">
                  <ScrollText className="h-3 w-3" />
                  Notas internas
                </p>
                <p className="mt-1 text-sm leading-relaxed text-ink">{item.notes}</p>
              </div>
            )}
          </section>

          <div className="animate-fade-up" style={{ animationDelay: "180ms" }}>
            {item.itemType === "CONTABLE" ? (
              <StockAdjuster
                itemId={item.id}
                quantity={item.quantity}
                minQuantity={item.minQuantity}
              />
            ) : (
              <div className="rounded-3xl border border-line bg-cream p-5 shadow-card sm:p-6">
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-ink-soft">
                  Pieza única
                </p>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  Este artículo se controla por <strong className="text-ink">estado</strong>,
                  no por unidades. Usa el panel de gestión para marcarlo como
                  prestado, en mantenimiento o de vuelta en su lugar.
                </p>
              </div>
            )}
          </div>

          <ItemCarePanel
            itemId={item.id}
            itemType={item.itemType}
            quantity={item.quantity}
            loans={loanRows}
            maintenance={maintenanceRows}
          />

          {/* ---------- Historial ---------- */}
          <section
            className="animate-fade-up rounded-3xl border border-line bg-cream p-5 shadow-card sm:p-6"
            style={{ animationDelay: "260ms" }}
          >
            <h2 className="font-display text-xl font-semibold tracking-tight text-ink">
              Historial de movimientos
            </h2>
            <ul className="mt-4 space-y-1">
              {history.map((m) => (
                <li
                  key={m.id}
                  className="flex items-start gap-3 rounded-xl px-2 py-2.5 transition hover:bg-paper/70"
                >
                  <MovementIcon type={m.type} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink">
                      {MOVEMENT_LABELS[m.type as MovementType] ?? m.type}
                      {m.quantity > 0 && (
                        <span className="ml-2 rounded-full bg-ink/5 px-2 py-0.5 font-mono text-[0.65rem] font-bold text-ink-soft">
                          {m.quantity} uds.
                        </span>
                      )}
                    </p>
                    {m.note && (
                      <p className="mt-0.5 truncate text-xs text-ink-soft">{m.note}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-[0.68rem] font-medium text-ink-faint">
                    {formatDateTime(m.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* ---------- Columna lateral ---------- */}
        <div className="space-y-6">
          {galleryIds.length > 0 && (
            <section className="animate-fade-up overflow-hidden rounded-3xl border border-line bg-cream p-3 shadow-card" style={{ animationDelay: "100ms" }}>
              <div className={galleryIds.length > 1 ? "grid grid-cols-2 gap-2" : ""}>
                {galleryIds.map((photoId, index) => (
                  <figure
                    key={photoId}
                    className={cn(
                      "overflow-hidden rounded-2xl border border-line-soft",
                      index === 0 && galleryIds.length > 1 && "col-span-2",
                    )}
                  >
                    <PhotoFrame
                      src={photoUrl(photoId)}
                      alt={`Fotografía ${index + 1} de ${item.name}`}
                      aspect={index === 0 ? "landscape" : "standard"}
                      overlay={
                        <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/75 to-transparent px-3 pb-2.5 pt-10 text-[0.6rem] font-semibold uppercase tracking-wider text-cream">
                          {index === 0 ? "Fotografía principal" : `Detalle ${index + 1}`}
                        </figcaption>
                      }
                    />
                  </figure>
                ))}
              </div>
            </section>
          )}
          <div className="animate-fade-up" style={{ animationDelay: "140ms" }}>
            <QrLabel itemId={item.id} code={item.code} />
          </div>
          <div className="animate-fade-up" style={{ animationDelay: "220ms" }}>
            <ItemActions item={item} zones={allZones} />
          </div>
        </div>
      </div>
    </div>
  );
}
