import Link from "next/link";
import { and, asc, desc, eq, isNull, lt, sql } from "drizzle-orm";
import {
  Clock,
  Download,
  FileText,
  Hammer,
  Handshake,
  Printer,
  QrCode,
  ScanLine,
} from "lucide-react";
import { db } from "@/db";
import { items, loans, maintenanceRecords, scanLogs, zones } from "@/db/schema";
import { authPageMetadata, requireAuthenticated } from "@/lib/auth";
import { formatDate, formatDateTime, formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return authPageMetadata("Informes y auditoría");
}

export default async function InformesPage() {
  await requireAuthenticated();
  const today = new Date();
  const future = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

  const [byZone, overdue, reviews, recentScans] = await Promise.all([
    db
      .select({
        zone: zones.name,
        count: sql<number>`count(${items.id})::int`,
        units: sql<number>`coalesce(sum(${items.quantity}), 0)::int`,
        value: sql<string>`coalesce(sum(${items.estimatedValue}), 0)`,
      })
      .from(zones)
      .leftJoin(items, and(eq(items.zoneId, zones.id), isNull(items.deletedAt)))
      .groupBy(zones.id)
      .orderBy(asc(zones.name)),
    db
      .select({ loan: loans, itemName: items.name, code: items.code })
      .from(loans)
      .innerJoin(items, eq(loans.itemId, items.id))
      .where(and(isNull(loans.returnedAt), lt(loans.dueAt, today)))
      .orderBy(asc(loans.dueAt)),
    db
      .select({ record: maintenanceRecords, itemName: items.name, code: items.code })
      .from(maintenanceRecords)
      .innerJoin(items, eq(maintenanceRecords.itemId, items.id))
      .where(and(isNull(maintenanceRecords.completedAt), sql`${maintenanceRecords.nextReviewAt} <= ${future}`))
      .orderBy(asc(maintenanceRecords.nextReviewAt)),
    db
      .select({
        log: scanLogs,
        itemName: items.name,
        zoneName: zones.name,
      })
      .from(scanLogs)
      .leftJoin(items, eq(scanLogs.matchedItemId, items.id))
      .leftJoin(zones, eq(scanLogs.matchedZoneId, zones.id))
      .orderBy(desc(scanLogs.scannedAt))
      .limit(15),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 lg:py-12">
      {/* ---------- Cabecera ---------- */}
      <header className="animate-fade-up">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-gold">
              Análisis, balances y auditoría
            </p>
            <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
              Informes
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">
              Documentación oficial para el Consejo Parroquial, control de
              préstamos y registro en vivo de lecturas QR.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/informes/anual"
              className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-xs font-bold text-cream shadow-lift transition hover:bg-basilica-deep"
            >
              <FileText className="h-3.5 w-3.5 text-gold-soft" />
              Balance Anual Oficial (A4 / PDF)
            </Link>
          </div>
        </div>
      </header>

      {/* ---------- Tabla de inventario por estancia ---------- */}
      <section className="mt-8 overflow-hidden rounded-3xl border border-line bg-cream shadow-card">
        <div className="flex items-center justify-between border-b border-line p-5">
          <h2 className="font-display text-xl font-semibold text-ink">
            Inventario valorado por estancia
          </h2>
          <a
            href="/api/export"
            download
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-1 text-xs font-semibold text-ink shadow-sm"
          >
            <Download className="h-3 w-3" /> Exportar CSV
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-paper text-[0.65rem] uppercase tracking-wider text-ink-soft">
              <tr>
                <th className="p-4">Estancia / Zona</th>
                <th className="p-4 text-center">Artículos</th>
                <th className="p-4 text-center">Unidades</th>
                <th className="p-4 text-right">Valor estimado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {byZone.map((r) => (
                <tr key={r.zone} className="transition hover:bg-paper/40">
                  <td className="p-4 font-semibold text-ink">{r.zone}</td>
                  <td className="p-4 text-center text-ink-soft">{r.count}</td>
                  <td className="p-4 text-center text-ink-soft">{r.units}</td>
                  <td className="p-4 text-right font-mono font-semibold text-ink">
                    {formatMoney(r.value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---------- Préstamos y revisiones ---------- */}
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="rounded-3xl border border-red-200 bg-red-50/60 p-5 shadow-card">
          <div className="flex items-center gap-2">
            <Handshake className="h-4.5 w-4.5 text-red-700" />
            <h2 className="font-display text-lg font-semibold text-ink">
              Préstamos vencidos ({overdue.length})
            </h2>
          </div>
          {overdue.length ? (
            <ul className="mt-3.5 space-y-2">
              {overdue.map((r) => (
                <li
                  key={r.loan.id}
                  className="rounded-2xl border border-red-200 bg-white p-3 text-xs leading-relaxed"
                >
                  <p className="font-bold text-ink">{r.itemName}</p>
                  <p className="text-ink-soft">
                    Depositario: <strong>{r.loan.borrower}</strong>
                  </p>
                  <p className="text-red-700 font-medium">
                    Venció el {formatDate(r.loan.dueAt)} · <span className="font-mono">{r.code}</span>
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-xs text-ink-soft">
              Excelente: ningún bien prestado tiene la fecha vencida.
            </p>
          )}
        </section>

        <section className="rounded-3xl border border-amber-200 bg-amber-50/60 p-5 shadow-card">
          <div className="flex items-center gap-2">
            <Hammer className="h-4.5 w-4.5 text-amber-700" />
            <h2 className="font-display text-lg font-semibold text-ink">
              Revisiones de mantenimiento ({reviews.length})
            </h2>
          </div>
          {reviews.length ? (
            <ul className="mt-3.5 space-y-2">
              {reviews.map((r) => (
                <li
                  key={r.record.id}
                  className="rounded-2xl border border-amber-200 bg-white p-3 text-xs leading-relaxed"
                >
                  <p className="font-bold text-ink">{r.itemName}</p>
                  <p className="text-ink-soft">{r.record.description}</p>
                  <p className="text-amber-800 font-medium">
                    Próxima revisión: {formatDate(r.record.nextReviewAt)} · <span className="font-mono">{r.code}</span>
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-xs text-ink-soft">
              No hay revisiones programadas para los próximos 30 días.
            </p>
          )}
        </section>
      </div>

      {/* ---------- Bitácora de escaneos recientes ---------- */}
      <section className="mt-8 rounded-3xl border border-line bg-cream p-5 shadow-card sm:p-6">
        <div className="flex items-center gap-2">
          <ScanLine className="h-5 w-5 text-gold-deep" />
          <h2 className="font-display text-xl font-semibold text-ink">
            Auditoría de lecturas QR recientes
          </h2>
        </div>
        <p className="mt-1 text-xs text-ink-soft">
          Registro en tiempo real de cada escaneo realizado con el móvil en la parroquia.
        </p>
        {recentScans.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-line bg-white/60 p-6 text-center text-xs text-ink-soft">
            Aún no se han registrado lecturas en esta sesión.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-line-soft">
            {recentScans.map((s) => (
              <li
                key={s.log.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="font-mono font-bold text-ink">{s.log.code}</span>
                  {s.itemName && (
                    <span className="text-ink-soft">
                      · {s.itemName} {s.zoneName && `(${s.zoneName})`}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-ink-faint">
                  <span className="rounded-full bg-paper px-2 py-0.5 text-[0.62rem] uppercase font-bold text-ink-soft">
                    {s.log.action}
                  </span>
                  <span>{formatDateTime(s.log.scannedAt)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

