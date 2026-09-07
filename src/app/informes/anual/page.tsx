import Link from "next/link";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { db } from "@/db";
import {
  appSettings,
  items,
  loans,
  maintenanceRecords,
  zones,
} from "@/db/schema";
import { authPageMetadata, requireAuthenticated } from "@/lib/auth";
import { formatDate, formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return authPageMetadata("Balance Anual Oficial");
}

export default async function InformeAnualPage() {
  await requireAuthenticated();

  const [
    [settings],
    byZone,
    byCondition,
    [totals],
    activeLoans,
    maintenanceList,
  ] = await Promise.all([
    db.select().from(appSettings).where(eq(appSettings.id, 1)),
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
      .select({
        condition: items.condition,
        count: sql<number>`count(*)::int`,
        value: sql<string>`coalesce(sum(${items.estimatedValue}), 0)`,
      })
      .from(items)
      .where(isNull(items.deletedAt))
      .groupBy(items.condition),
    db
      .select({
        totalItems: sql<number>`count(*)::int`,
        totalUnits: sql<number>`coalesce(sum(${items.quantity}), 0)::int`,
        totalValue: sql<string>`coalesce(sum(${items.estimatedValue}), 0)`,
      })
      .from(items)
      .where(isNull(items.deletedAt)),
    db
      .select({
        loan: loans,
        itemName: items.name,
        code: items.code,
      })
      .from(loans)
      .innerJoin(items, eq(loans.itemId, items.id))
      .where(isNull(loans.returnedAt))
      .orderBy(asc(loans.lentAt)),
    db
      .select({
        record: maintenanceRecords,
        itemName: items.name,
        code: items.code,
      })
      .from(maintenanceRecords)
      .innerJoin(items, eq(maintenanceRecords.itemId, items.id))
      .orderBy(asc(maintenanceRecords.startedAt))
      .limit(10),
  ]);

  const parishName = settings?.parishName ?? "Parroquia Santa Bárbara";
  const dateStr = new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="min-h-dvh bg-paper pb-16">
      {/* ---------- Barra superior para imprimir ---------- */}
      <div className="no-print sticky top-0 z-20 border-b border-white/10 bg-ink px-4 py-3">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <Link
            href="/informes"
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-cream hover:bg-white/10"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver a informes
          </Link>
          <div className="flex gap-2">
            <a
              href="/api/export"
              download
              className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3.5 py-1.5 text-xs font-semibold text-cream hover:bg-white/10"
            >
              <Download className="h-3.5 w-3.5" />
              Descargar CSV
            </a>
            <button
              onClick={() => {
                if (typeof window !== "undefined") window.print();
              }}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-gold px-4 py-1.5 text-xs font-bold text-ink shadow-lift"
            >
              <Printer className="h-3.5 w-3.5" />
              Imprimir informe oficial (PDF)
            </button>
          </div>
        </div>
      </div>

      {/* ---------- Documento Formal A4 ---------- */}
      <div className="mx-auto max-w-4xl px-4 pt-8 print:p-0">
        <article className="rounded-3xl border border-line bg-white p-8 shadow-card sm:p-12 print:border-0 print:p-0 print:shadow-none font-serif text-ink">
          {/* Encabezado eclesial */}
          <header className="border-b-2 border-ink pb-6 text-center">
            <p className="text-xs uppercase tracking-[0.25em] text-stone-600">
              Diócesis · Inventario General de Bienes y Enseres
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              {parishName}
            </h1>
            {settings?.address && (
              <p className="mt-1 text-xs text-stone-600">{settings.address}</p>
            )}
            <p className="mt-3 text-sm italic text-stone-600">
              Estado de Inventario y Balance Patrimonial · Expedido el {dateStr}
            </p>
          </header>

          {/* Resumen ejecutivo */}
          <section className="mt-8">
            <h2 className="text-sm font-bold uppercase tracking-wider text-ink border-b border-stone-300 pb-1">
              1. Resumen General del Patrimonio
            </h2>
            <div className="mt-4 grid grid-cols-3 gap-4 text-center">
              <div className="border border-stone-300 p-3 rounded">
                <span className="block text-2xl font-bold">{totals.totalItems}</span>
                <span className="block text-xs uppercase tracking-wider text-stone-600">
                  Artículos catalogados
                </span>
              </div>
              <div className="border border-stone-300 p-3 rounded">
                <span className="block text-2xl font-bold">{totals.totalUnits}</span>
                <span className="block text-xs uppercase tracking-wider text-stone-600">
                  Unidades físicas
                </span>
              </div>
              <div className="border border-stone-300 p-3 rounded bg-stone-50">
                <span className="block text-2xl font-bold text-gold-deep">
                  {formatMoney(totals.totalValue)}
                </span>
                <span className="block text-xs uppercase tracking-wider text-stone-600">
                  Valoración total estimada
                </span>
              </div>
            </div>
          </section>

          {/* Desglose por estancias / zonas */}
          <section className="mt-8">
            <h2 className="text-sm font-bold uppercase tracking-wider text-ink border-b border-stone-300 pb-1">
              2. Distribución y Valoración por Estancias
            </h2>
            <table className="mt-3 w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b-2 border-stone-400 font-bold uppercase tracking-wider text-stone-700">
                  <th className="py-2">Estancia / Zona</th>
                  <th className="py-2 text-center">Artículos</th>
                  <th className="py-2 text-center">Unidades</th>
                  <th className="py-2 text-right">Valor estimado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {byZone.map((z) => (
                  <tr key={z.zone}>
                    <td className="py-2 font-medium">{z.zone}</td>
                    <td className="py-2 text-center">{z.count}</td>
                    <td className="py-2 text-center">{z.units}</td>
                    <td className="py-2 text-right">{formatMoney(z.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Estado de conservación */}
          <section className="mt-8">
            <h2 className="text-sm font-bold uppercase tracking-wider text-ink border-b border-stone-300 pb-1">
              3. Estado de Conservación de las Piezas
            </h2>
            <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
              {byCondition.map((c) => (
                <div key={c.condition} className="border border-stone-200 p-2.5 rounded">
                  <span className="block font-bold text-sm">{c.count}</span>
                  <span className="block uppercase text-[10px] text-stone-600">
                    {c.condition}
                  </span>
                  <span className="block text-[10px] text-stone-500 mt-0.5">
                    {formatMoney(c.value)}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Préstamos en curso si existen */}
          {activeLoans.length > 0 && (
            <section className="mt-8">
              <h2 className="text-sm font-bold uppercase tracking-wider text-ink border-b border-stone-300 pb-1">
                4. Bienes en Régimen de Préstamo Activo
              </h2>
              <table className="mt-3 w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-400 font-bold text-stone-700">
                    <th className="py-1.5">Código</th>
                    <th className="py-1.5">Bien</th>
                    <th className="py-1.5">Depositario</th>
                    <th className="py-1.5 text-right">Fecha préstamo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {activeLoans.map((l) => (
                    <tr key={l.loan.id}>
                      <td className="py-1.5 font-mono text-[11px]">{l.code}</td>
                      <td className="py-1.5">{l.itemName}</td>
                      <td className="py-1.5">{l.loan.borrower}</td>
                      <td className="py-1.5 text-right">{formatDate(l.loan.lentAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {/* Diligencia de firmas y cierre */}
          <footer className="mt-12 border-t-2 border-stone-300 pt-6 text-xs text-stone-700">
            <p className="italic text-center">
              Diligencia: El presente inventario refleja con fidelidad el registro de bienes muebles y enseres custodiados en esta parroquia a fecha de su expedición.
            </p>
            <div className="mt-12 grid grid-cols-3 gap-8 text-center pt-8">
              <div>
                <div className="border-t border-stone-400 pt-2 font-bold">
                  El Párroco
                </div>
                <p className="text-[10px] text-stone-500">Firma y sello parroquial</p>
              </div>
              <div>
                <div className="border-t border-stone-400 pt-2 font-bold">
                  El Ecónomo / Administrador
                </div>
                <p className="text-[10px] text-stone-500">Conformidad económica</p>
              </div>
              <div>
                <div className="border-t border-stone-400 pt-2 font-bold">
                  Consejo de Pastoral
                </div>
                <p className="text-[10px] text-stone-500">Toma de razón</p>
              </div>
            </div>
          </footer>
        </article>
      </div>
    </div>
  );
}
