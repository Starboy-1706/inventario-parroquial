import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";
import { getItemsPage } from "@/lib/queries";
import { requireAuthenticated, authPageMetadata } from "@/lib/auth";
import { TrashActions } from "@/components/trash-actions";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";
export async function generateMetadata() { return authPageMetadata("Papelera"); }

export default async function PapeleraPage() {
  await requireAuthenticated();
  const result = await getItemsPage({ deleted: true, pageSize: 100 });
  return (
    <div className="mx-auto max-w-4xl px-5 py-8 sm:px-8 lg:py-12">
      <Link href="/inventario" className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-soft"><ArrowLeft className="h-3.5 w-3.5" />Volver al inventario</Link>
      <header className="mt-5">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-red-600">Recuperación segura</p>
        <h1 className="mt-2 font-display text-4xl font-semibold text-ink">Papelera</h1>
        <p className="mt-2 text-sm text-ink-soft">{result.total} artículo{result.total === 1 ? "" : "s"}. Restaura o elimina definitivamente confirmando su código.</p>
      </header>
      {result.data.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-line bg-cream p-12 text-center"><Trash2 className="mx-auto h-7 w-7 text-ink-faint" /><p className="mt-3 font-semibold">La papelera está vacía</p></div>
      ) : (
        <ul className="mt-8 space-y-3">
          {result.data.map((item) => (
            <li key={item.id} className="rounded-2xl border border-line bg-cream p-4 shadow-card sm:flex sm:items-center sm:gap-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink">{item.name}</p>
                <p className="mt-0.5 text-xs text-ink-soft"><span className="font-mono">{item.code}</span> · {item.zoneName} · eliminado {formatDateTime(item.deletedAt)}</p>
                {item.deletedReason && <p className="mt-1 text-xs italic text-ink-faint">{item.deletedReason}</p>}
              </div>
              <TrashActions id={item.id} code={item.code} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
