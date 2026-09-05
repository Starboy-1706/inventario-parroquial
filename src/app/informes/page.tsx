import { and, asc, eq, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { items, loans, maintenanceRecords, zones } from "@/db/schema";
import { authPageMetadata, requireAuthenticated } from "@/lib/auth";
import { formatDate, formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";
export async function generateMetadata() { return authPageMetadata("Informes"); }
export default async function InformesPage() {
  await requireAuthenticated();
  const today = new Date(); const future = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const [byZone, overdue, reviews] = await Promise.all([
    db.select({ zone: zones.name, count: sql<number>`count(${items.id})::int`, units: sql<number>`coalesce(sum(${items.quantity}),0)::int`, value: sql<string>`coalesce(sum(${items.estimatedValue}),0)` }).from(zones).leftJoin(items, and(eq(items.zoneId, zones.id), isNull(items.deletedAt))).groupBy(zones.id).orderBy(asc(zones.name)),
    db.select({ loan: loans, itemName: items.name, code: items.code }).from(loans).innerJoin(items, eq(loans.itemId, items.id)).where(and(isNull(loans.returnedAt), lt(loans.dueAt, today))).orderBy(asc(loans.dueAt)),
    db.select({ record: maintenanceRecords, itemName: items.name, code: items.code }).from(maintenanceRecords).innerJoin(items, eq(maintenanceRecords.itemId, items.id)).where(and(isNull(maintenanceRecords.completedAt), sql`${maintenanceRecords.nextReviewAt} <= ${future}`)).orderBy(asc(maintenanceRecords.nextReviewAt)),
  ]);
  return <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 lg:py-12"><header><p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-gold">Análisis y auditoría</p><h1 className="mt-2 font-display text-4xl font-semibold text-ink">Informes</h1><p className="mt-2 text-sm text-ink-soft">Resumen para el consejo parroquial y control operativo.</p></header>
    <section className="mt-8 overflow-hidden rounded-3xl border border-line bg-cream shadow-card"><div className="border-b border-line p-5"><h2 className="font-display text-xl font-semibold">Inventario por zona</h2></div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-paper text-[0.65rem] uppercase tracking-wider text-ink-soft"><tr><th className="p-3">Zona</th><th>Artículos</th><th>Unidades</th><th>Valor</th></tr></thead><tbody>{byZone.map((r) => <tr key={r.zone} className="border-t border-line-soft"><td className="p-3 font-semibold">{r.zone}</td><td>{r.count}</td><td>{r.units}</td><td>{formatMoney(r.value)}</td></tr>)}</tbody></table></div></section>
    <div className="mt-6 grid gap-6 md:grid-cols-2"><section className="rounded-3xl border border-red-200 bg-red-50/50 p-5"><h2 className="font-display text-xl font-semibold">Préstamos vencidos</h2>{overdue.length ? <ul className="mt-3 space-y-2">{overdue.map((r) => <li key={r.loan.id} className="text-sm"><strong>{r.itemName}</strong> · {r.loan.borrower}<span className="block text-xs text-red-700">Venció {formatDate(r.loan.dueAt)} · {r.code}</span></li>)}</ul> : <p className="mt-3 text-sm text-ink-soft">Ningún préstamo vencido.</p>}</section><section className="rounded-3xl border border-amber-200 bg-amber-50/50 p-5"><h2 className="font-display text-xl font-semibold">Revisiones próximas</h2>{reviews.length ? <ul className="mt-3 space-y-2">{reviews.map((r) => <li key={r.record.id} className="text-sm"><strong>{r.itemName}</strong><span className="block text-xs text-amber-800">{formatDate(r.record.nextReviewAt)} · {r.code}</span></li>)}</ul> : <p className="mt-3 text-sm text-ink-soft">Sin revisiones en los próximos 30 días.</p>}</section></div>
  </div>;
}
