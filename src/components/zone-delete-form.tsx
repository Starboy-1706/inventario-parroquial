"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import type { ZoneWithCount } from "@/lib/queries";
import { Button, Field, inputCls, ZoneIcon } from "@/components/ui";
import { secureFetch } from "@/lib/secure-fetch";

/** Eliminación de zona con traslado de artículos como página completa. */
export function ZoneDeleteForm({
  zone,
  destinations,
}: {
  zone: ZoneWithCount;
  destinations: { id: number; name: string }[];
}) {
  const router = useRouter();
  const [destinationZoneId, setDestinationZoneId] = useState<number>(
    destinations[0]?.id ?? 0,
  );
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsDestination = zone.totalCount > 0;

  async function confirmDelete() {
    setDeleting(true);
    setError(null);
    if (needsDestination && !destinationZoneId) {
      setError("Elige una zona de destino para conservar los artículos.");
      setDeleting(false);
      return;
    }
    const res = await secureFetch(`/api/zones/${zone.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        destinationZoneId: needsDestination ? destinationZoneId : null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setDeleting(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo eliminar la zona.");
      return;
    }
    router.push("/zonas");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-8 sm:py-16">
      <div className="animate-fade-up rounded-3xl border border-red-200 bg-cream p-6 shadow-card sm:p-8">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-700">
            <Trash2 className="h-5 w-5" />
          </span>
          <ZoneIcon icon={zone.icon} color={zone.color} size="md" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Eliminar {zone.name}
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Esta acción no se puede deshacer.
        </p>

        <div className="mt-5 space-y-4">
          {needsDestination ? (
            <>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">
                Esta zona contiene{" "}
                <strong>
                  {zone.itemCount} artículo{zone.itemCount === 1 ? "" : "s"} activo
                  {zone.itemCount === 1 ? "" : "s"}
                </strong>
                {zone.trashCount > 0 && (
                  <>
                    {" "}
                    y <strong>{zone.trashCount} en papelera</strong>
                  </>
                )}
                . No se borrará ninguno: todos se trasladarán a la zona elegida,
                conservando sus códigos e historiales.
              </div>
              {destinations.length > 0 ? (
                <Field label="Trasladar todo a">
                  <select
                    value={destinationZoneId}
                    onChange={(event) => setDestinationZoneId(Number(event.target.value))}
                    className={inputCls}
                  >
                    {destinations.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  No existe otra zona de destino. Crea una zona nueva antes de
                  eliminar esta, o elimina definitivamente sus artículos desde la
                  papelera.
                </p>
              )}
            </>
          ) : (
            <p className="rounded-2xl border border-line bg-white/70 px-4 py-3 text-sm leading-relaxed text-ink-soft">
              La zona está vacía y puede eliminarse de forma segura.
            </p>
          )}

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 border-t border-line-soft pt-5 sm:flex-row sm:justify-end">
            <Link
              href="/zonas"
              className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-ink-soft transition hover:bg-ink/5 hover:text-ink"
            >
              Cancelar
            </Link>
            <Button
              variant="danger"
              onClick={() => void confirmDelete()}
              disabled={
                deleting ||
                (needsDestination && destinations.length === 0)
              }
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              {needsDestination ? "Trasladar y eliminar" : "Eliminar zona"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
