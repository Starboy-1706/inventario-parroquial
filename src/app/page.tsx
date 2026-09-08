import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowRightLeft,
  ArrowUpRight,
  BarChart3,
  Boxes,
  ClipboardCheck,
  ClipboardList,
  Coins,
  FileText,
  Handshake,
  HelpCircle,
  Landmark,
  MapPinned,
  PackagePlus,
  Play,
  PlusCircle,
  RefreshCcw,
  ScanLine,
  Trash2,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { getDashboardStats, getZonesWithCounts } from "@/lib/queries";
import { formatMoney, photoUrl, timeAgo } from "@/lib/utils";
import { MOVEMENT_LABELS, type MovementType } from "@/lib/constants";
import { StatusBadge, ZoneIcon } from "@/components/ui";
import { PhotoFrame } from "@/components/photo-frame";
import { authPageMetadata, requireAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return authPageMetadata("Panel general");
}

const MOVEMENT_ICONS: Partial<Record<MovementType, LucideIcon>> = {
  ALTA: PlusCircle,
  ENTRADA: ArrowDownLeft,
  SALIDA: ArrowUpRight,
  AJUSTE: ClipboardList,
  TRASLADO: ArrowRightLeft,
  ESTADO: RefreshCcw,
  BAJA: Trash2,
};

const MOVEMENT_TINT: Partial<Record<MovementType, string>> = {
  ALTA: "bg-emerald-100 text-emerald-700",
  ENTRADA: "bg-emerald-100 text-emerald-700",
  SALIDA: "bg-amber-100 text-amber-700",
  AJUSTE: "bg-sky-100 text-sky-700",
  TRASLADO: "bg-violet-100 text-violet-700",
  ESTADO: "bg-stone-200/70 text-stone-600",
  BAJA: "bg-red-100 text-red-700",
};

export default async function DashboardPage() {
  await requireAuthenticated();
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
      note: `${stats.totalUnits} unidades físicas`,
    },
    {
      label: "Estancias / Zonas",
      value: stats.zoneCount,
      icon: Landmark,
      note: "Ubicaciones catalogadas",
    },
    {
      label: "Prestados / En revisión",
      value: stats.lent + stats.maintenance,
      icon: RefreshCcw,
      note: `${stats.lent} prestados · ${stats.maintenance} mantenimiento`,
    },
    {
      label: "Valoración estimada",
      value: formatMoney(stats.totalValue),
      icon: Coins,
      note: "Tasación patrimonial",
      small: true,
    },
  ];

  // Cálculo para gráfico SVG de distribución por estancia
  const maxZoneCount = Math.max(...zones.map((z) => z.itemCount), 1);

  return (
    <div className="mx-auto max-w-6xl px-4 py-5 sm:px-8 sm:py-12">
      {/* ---------- Cabecera ---------- */}
      <header className="animate-fade-up">
        <p className="text-[0.62rem] sm:text-[0.65rem] font-bold uppercase tracking-[0.22em] text-gold-deep dark:text-gold-soft">
          Parroquia Santa Bárbara · {today}
        </p>
        <h1 className="mt-2 max-w-2xl font-display text-2xl sm:text-4xl lg:text-5xl font-semibold leading-[1.12] tracking-tight text-ink">
          La casa del Señor,{" "}
          <em className="font-light italic text-gold-deep dark:text-gold-soft">bien ordenada.</em>
        </h1>
        <p className="mt-2 max-w-xl text-xs sm:text-sm leading-relaxed text-ink-soft">
          Inventario parroquial con códigos permanentes, modo recuento por estancia,
          control de préstamos y lectura QR en tiempo real.
        </p>

        {/* Botones de acción rápida: en móvil son botones táctiles grandes 2x2 */}
        <div className="mt-5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
          <Link
            href="/escaner"
            className="group flex items-center justify-center gap-2 rounded-2xl bg-ink px-4 py-3 text-xs sm:text-sm font-bold text-cream shadow-lift transition hover:bg-basilica-deep active:scale-95 sm:rounded-full sm:px-5"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-gold-soft" />
            </span>
            <span>Escanear QR</span>
            <ScanLine className="h-4 w-4 text-gold-soft transition-transform group-hover:scale-110" />
          </Link>
          <Link
            href="/recuento"
            className="flex items-center justify-center gap-2 rounded-2xl border border-gold/40 bg-gold/15 px-4 py-3 text-xs sm:text-sm font-bold text-gold-deep transition hover:bg-gold/25 active:scale-95 sm:rounded-full sm:px-5"
          >
            <Play className="h-3.5 w-3.5 fill-gold text-gold-deep" />
            <span>Recuento</span>
          </Link>
          <Link
            href="/inventario/nuevo"
            className="flex items-center justify-center gap-2 rounded-2xl border border-line bg-cream px-4 py-3 text-xs sm:text-sm font-semibold text-ink transition hover:border-ink/25 active:scale-95 sm:rounded-full sm:px-5"
          >
            <PackagePlus className="h-3.5 w-3.5 text-gold-deep" />
            <span>+ Artículo</span>
          </Link>
          <Link
            href="/ayuda"
            className="flex items-center justify-center gap-2 rounded-2xl border border-line bg-cream px-4 py-3 text-xs sm:text-sm font-semibold text-ink-soft hover:text-ink active:scale-95 sm:rounded-full sm:px-4 sm:border-0 sm:bg-transparent"
          >
            <HelpCircle className="h-3.5 w-3.5 text-gold-deep" />
            <span>Guía</span>
          </Link>
        </div>
      </header>

      {/* ---------- Banner de alertas operativas ---------- */}
      {(stats.overdueLoans > 0 || stats.lowStock.length > 0) && (
        <section className="mt-8 animate-fade-up">
          <div className="grid gap-3 sm:grid-cols-2">
            {stats.overdueLoans > 0 && (
              <Link
                href="/informes"
                className="flex items-center justify-between gap-3 rounded-2xl border border-red-300 bg-red-50/80 p-4 shadow-sm transition hover:bg-red-50"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700">
                    <Handshake className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-red-800">
                      {stats.overdueLoans} préstamo(s) vencido(s)
                    </p>
                    <p className="text-xs text-red-900/80">
                      Hay bienes cuya fecha de devolución ya ha pasado.
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-red-700 shrink-0" />
              </Link>
            )}

            {stats.lowStock.length > 0 && (
              <Link
                href="/inventario?tipo=CONTABLE"
                className="flex items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50/80 p-4 shadow-sm transition hover:bg-amber-50"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                    <TriangleAlert className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-amber-900">
                      {stats.lowStock.length} alerta(s) de stock bajo
                    </p>
                    <p className="text-xs text-amber-950/80">
                      Hostias, velas o consumibles por debajo del mínimo.
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-amber-800 shrink-0" />
              </Link>
            )}
          </div>
        </section>
      )}

      {/* ---------- Estadísticas clave ---------- */}
      <section className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {statCards.map((s, i) => (
          <div
            key={s.label}
            className="animate-fade-up rounded-2xl border border-line bg-cream p-4 shadow-card sm:p-5"
            style={{ animationDelay: `${80 + i * 70}ms` }}
          >
            <s.icon className="h-4.5 w-4.5 text-gold" strokeWidth={1.8} />
            <p
              className={`mt-3 font-display font-semibold tracking-tight text-ink ${
                s.small ? "break-words text-xl leading-tight sm:text-3xl" : "text-2xl sm:text-4xl"
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

      {/* ---------- Gráfico visual SVG de distribución ---------- */}
      {zones.length > 0 && stats.totalItems > 0 && (
        <section className="mt-10 animate-fade-up rounded-3xl border border-line bg-cream p-5 shadow-card sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-gold-deep" />
              <h2 className="font-display text-xl font-semibold text-ink">
                Distribución de bienes por estancia
              </h2>
            </div>
            <Link
              href="/informes"
              className="text-xs font-semibold uppercase tracking-wider text-gold-deep hover:text-gold"
            >
              Ver desglose completo →
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {zones.map((z) => {
              const widthPct = Math.max(8, Math.round((z.itemCount / maxZoneCount) * 100));
              return (
                <div key={z.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 font-semibold text-ink">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: z.color }}
                      />
                      {z.name}
                    </span>
                    <span className="font-mono text-ink-soft">
                      {z.itemCount} arts. ({z.unitCount} uds.)
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-paper-deep">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${widthPct}%`,
                        backgroundColor: z.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ---------- Zonas + Actividad ---------- */}
      <div className="mt-12 grid gap-10 lg:grid-cols-[1.5fr_1fr]">
        {/* Zonas */}
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
                    <PhotoFrame
                      src={zPhoto}
                      alt={`Fotografía de ${z.name}`}
                      aspect="wide"
                      imageClassName="group-hover:scale-[1.025]"
                      className="border-b border-line-soft"
                      overlay={
                        <span className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-ink/40 to-transparent" />
                      }
                    />
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <span className="relative -mt-10 rounded-2xl border border-line-soft bg-cream p-1 shadow-lift z-10 shrink-0">
                          <ZoneIcon icon={z.icon} color={z.color} />
                        </span>
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

        {/* Alertas + Últimos movimientos */}
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
          <span>Códigos PSB permanentes</span>
          <span>Modo recuento por estancia</span>
          <span>Préstamos y mantenimiento</span>
          <span className="flex items-center gap-1.5">
            <StatusBadge status="DISPONIBLE" /> estados auditados
          </span>
        </div>
      </footer>
    </div>
  );
}
