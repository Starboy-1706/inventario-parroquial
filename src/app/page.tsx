import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowRightLeft,
  ArrowUpRight,
  Boxes,
  ClipboardList,
  Coins,
  Landmark,
  MapPinned,
  PackagePlus,
  PlusCircle,
  RefreshCcw,
  ScanLine,
  Trash2,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { getDashboardStats, getZonesWithCounts } from "@/lib/queries";
import { cn, formatMoney, photoUrl, timeAgo } from "@/lib/utils";
import { MOVEMENT_LABELS, type MovementType } from "@/lib/constants";
import { StatusBadge, ZoneIcon } from "@/components/ui";
import { pageMetadata, requireAuthorizedIp } from "@/lib/access";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return pageMetadata("Panel");
}

const MOVEMENT_ICONS: Record<MovementType, LucideIcon> = {
  ALTA: PlusCircle,
  ENTRADA: ArrowDownLeft,
  SALIDA: ArrowUpRight,
  AJUSTE: ClipboardList,
  TRASLADO: ArrowRightLeft,
  ESTADO: RefreshCcw,
  BAJA: Trash2,
};

const MOVEMENT_TINT: Record<MovementType, string> = {
  ALTA: "bg-emerald-100 text-emerald-700",
  ENTRADA: "bg-emerald-100 text-emerald-700",
  SALIDA: "bg-amber-100 text-amber-700",
  AJUSTE: "bg-sky-100 text-sky-700",
  TRASLADO: "bg-violet-100 text-violet-700",
  ESTADO: "bg-stone-200/70 text-stone-600",
  BAJA: "bg-red-100 text-red-700",
};

export default async function DashboardPage() {
  await requireAuthorizedIp();
  const [stats, zones] = await Promise.all([
    getDashboardStats(),
    getZonesWithCounts(),
  ]);

  const today = new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  const statCards = [
    {
      label: "Artículos registrados",
      value: stats.totalItems,
      icon: Boxes,
      note: `${stats.totalUnits} unidades en total`,
    },
    {
      label: "Zonas de la parroquia",
      value: stats.zoneCount,
      icon: Landmark,
      note: "Ubicaciones activas",
    },
    {
      label: "Prestados / en revisión",
      value: stats.lent + stats.maintenance,
      icon: RefreshCcw,
      note: `${stats.lent} prestados · ${stats.maintenance} mantenimiento`,
    },
    {
      label: "Valor estimado",
      value: formatMoney(stats.totalValue),
      icon: Coins,
      note: "Tasación del inventario",
      small: true,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-12">
      {/* ---------- Cabecera ---------- */}
      <header className="animate-fade-up">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-gold">
          Panel general · {today}
        </p>
        <h1 className="mt-3 max-w-2xl font-display text-4xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-5xl">
          La casa del Señor,{" "}
          <em className="font-light italic text-gold-deep">bien ordenada.</em>
        </h1>
        <p className="mt-3 max-w-xl text-[0.95rem] leading-relaxed text-ink-soft">
          Inventario parroquial por zonas con códigos escaneables, control de
          existencias y lectura por cámara en tiempo real.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            href="/escaner"
            className="group inline-flex items-center gap-2.5 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-cream shadow-lift transition-all hover:bg-basilica-deep"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-gold-soft" />
            </span>
            Escanear un código
            <ScanLine className="h-4 w-4 text-gold-soft transition-transform group-hover:scale-110" />
          </Link>
          <Link
            href="/inventario"
            className="inline-flex items-center gap-2 rounded-full border border-line bg-cream px-5 py-3 text-sm font-semibold text-ink transition hover:border-ink/25"
          >
            Ver inventario completo
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {/* ---------- Estadísticas ---------- */}
      <section className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {statCards.map((s, i) => (
          <div
            key={s.label}
            className="animate-fade-up rounded-2xl border border-line bg-cream p-4 shadow-card sm:p-5"
            style={{ animationDelay: `${80 + i * 70}ms` }}
          >
            <s.icon className="h-4.5 w-4.5 text-gold" strokeWidth={1.8} />
            <p
              className={`mt-3 font-display font-semibold tracking-tight text-ink ${
                s.small ? "text-2xl sm:text-3xl" : "text-3xl sm:text-4xl"
              }`}
            >
              {s.value}
            </p>
            <p className="mt-1 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-ink-soft">
              {s.label}
            </p>
            <p className="mt-0.5 text-[0.72rem] text-ink-faint">{s.note}</p>
          </div>
        ))}
      </section>

      <div className="mt-12 grid gap-10 lg:grid-cols-[1.5fr_1fr]">
        {/* ---------- Zonas ---------- */}
        <section className="animate-fade-up" style={{ animationDelay: "260ms" }}>
          <div className="flex items-end justify-between">
            <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
              Zonas de la parroquia
            </h2>
            <Link
              href="/zonas"
              className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-deep hover:text-gold"
            >
              Gestionar →
            </Link>
          </div>
          {zones.length === 0 ? (
            <div className="mt-4 rounded-3xl border border-dashed border-line bg-cream/70 p-8 text-center">
              <MapPinned className="mx-auto h-8 w-8 text-gold/70" />
              <p className="mt-3 font-display text-base font-semibold text-ink">
                Aún no hay zonas creadas
              </p>
              <p className="mx-auto mt-1 max-w-sm text-xs text-ink-soft">
                Crea tu primera ubicación (ej. Sacristía, Despacho) para clasificar el inventario.
              </p>
              <Link
                href="/zonas"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-cream transition hover:bg-ink/85"
              >
                Crear primera zona →
              </Link>
            </div>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {zones.map((z) => {
                const zPhoto = photoUrl(z.photoId);
                return (
                  <Link
                    key={z.id}
                    href={`/inventario?zona=${z.id}`}
                    className="group relative overflow-hidden rounded-2xl border border-line bg-cream shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift"
                  >
                    <span
                      className="absolute inset-x-0 top-0 z-10 h-1 opacity-80"
                      style={{ backgroundColor: z.color }}
                    />
                    {zPhoto && (
                      <div className="relative h-28 w-full overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={zPhoto}
                          alt={`Fotografía de ${z.name}`}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <span className="absolute inset-0 bg-gradient-to-t from-ink/45 via-transparent to-transparent" />
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        {zPhoto ? (
                          <span className={cn(zPhoto && "-mt-9 rounded-2xl bg-cream p-1 shadow-lift", "relative")}>
                            <ZoneIcon icon={z.icon} color={z.color} />
                          </span>
                        ) : (
                          <ZoneIcon icon={z.icon} color={z.color} />
                        )}
                        <ArrowUpRight className="h-4 w-4 text-ink-faint opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-100" />
                      </div>
                      <h3 className="mt-3.5 font-display text-lg font-semibold leading-tight text-ink">
                        {z.name}
                      </h3>
                      <p className="mt-0.5 line-clamp-1 text-xs text-ink-soft">
                        {z.description ?? "—"}
                      </p>
                      <p className="mt-3 flex items-baseline gap-1.5 text-xs text-ink-soft">
                        <span className="font-display text-xl font-semibold text-ink">
                          {z.itemCount}
                        </span>
                        artículos
                        <span className="text-ink-faint">·</span>
                        <span className="font-semibold text-ink">{z.unitCount}</span> uds.
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* ---------- Alertas + actividad ---------- */}
        <div className="space-y-10">
          <section className="animate-fade-up" style={{ animationDelay: "340ms" }}>
            <div className="flex items-center gap-2">
              <TriangleAlert className="h-4 w-4 text-wine" />
              <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
                Stock bajo
              </h2>
            </div>
            {stats.lowStock.length === 0 ? (
              <p className="mt-4 rounded-2xl border border-dashed border-line bg-cream/70 px-4 py-6 text-sm text-ink-soft">
                Todas las reservas están por encima del mínimo. Buen trabajo.
              </p>
            ) : (
              <ul className="mt-4 space-y-2">
                {stats.lowStock.map((it) => (
                  <li key={it.id}>
                    <Link
                      href={`/inventario/${it.id}`}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-red-200/70 bg-red-50/60 px-4 py-3 transition hover:border-red-300"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">
                          {it.name}
                        </p>
                        <p className="text-xs text-ink-soft">
                          <span
                            className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle"
                            style={{ backgroundColor: it.zoneColor }}
                          />
                          {it.zoneName}
                          <span className="mx-1.5 text-ink-faint">·</span>
                          <span className="font-mono text-[0.68rem]">{it.code}</span>
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full border border-red-200 bg-white px-2.5 py-1 text-[0.7rem] font-bold text-red-700">
                        {it.quantity} / mín. {it.minQuantity}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="animate-fade-up" style={{ animationDelay: "420ms" }}>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
              Últimos movimientos
            </h2>
            {stats.recentMovements.length === 0 ? (
              <p className="mt-4 rounded-2xl border border-dashed border-line bg-cream/70 px-4 py-6 text-sm text-ink-soft">
                Aún no hay movimientos registrados. Las altas, cambios de estado y recuentos aparecerán aquí.
              </p>
            ) : (
              <ul className="mt-4 space-y-0.5 border-l border-line pl-0">
                {stats.recentMovements.map((m) => {
                  const Icon = MOVEMENT_ICONS[m.type as MovementType] ?? ClipboardList;
                  return (
                    <li
                      key={m.id}
                      className="relative flex items-start gap-3 rounded-r-xl py-2.5 pl-5 pr-2 transition hover:bg-cream/80"
                    >
                      <span
                        className={`absolute -left-[1.02rem] top-3 flex h-8 w-8 items-center justify-center rounded-full border border-line ${MOVEMENT_TINT[m.type as MovementType] ?? MOVEMENT_TINT.ESTADO}`}
                      >
                        <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink">
                          {m.itemName}
                        </p>
                        <p className="truncate text-xs text-ink-soft">
                          {MOVEMENT_LABELS[m.type as MovementType] ?? m.type}
                          {m.note ? ` · ${m.note}` : ""}
                        </p>
                      </div>
                      <span className="shrink-0 text-[0.68rem] font-medium text-ink-faint">
                        {timeAgo(m.createdAt)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>

      {/* ---------- Pie de la página principal ---------- */}
      <footer className="mt-14 rounded-3xl border border-line bg-ink px-6 py-8 sm:px-10">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.26em] text-gold-soft/80">
              Lectura instantánea
            </p>
            <p className="mt-2 max-w-md font-display text-xl font-medium italic leading-snug text-cream sm:text-2xl">
              Acerca la cámara a cualquier etiqueta QR y consulta la ficha del
              artículo al momento.
            </p>
          </div>
          <Link
            href="/escaner"
            className="inline-flex items-center gap-2.5 rounded-full bg-gold px-6 py-3.5 text-sm font-bold text-ink shadow-lift transition hover:bg-gold-soft"
          >
            <ScanLine className="h-4 w-4" strokeWidth={2.2} />
            Abrir escáner
          </Link>
        </div>
        <div className="mt-6 flex flex-wrap gap-x-8 gap-y-2 border-t border-white/10 pt-5 text-[0.7rem] text-cream/40">
          <span>Códigos únicos por artículo</span>
          <span>Piezas únicas vs. acumulables</span>
          <span>Registro histórico de movimientos</span>
          <span className="flex items-center gap-1.5">
            <StatusBadge status="DISPONIBLE" /> estados claros
          </span>
        </div>
      </footer>
    </div>
  );
}
