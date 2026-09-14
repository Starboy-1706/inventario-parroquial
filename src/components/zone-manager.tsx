"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  PencilLine,
  QrCode,
  Ruler,
  Trash2,
} from "lucide-react";
import type { ZoneWithCount } from "@/lib/queries";
import { ZoneIcon } from "@/components/ui";
import { EmptyState } from "@/components/empty-state";
import { PhotoFrame } from "@/components/photo-frame";
import { formatZoneDimensions, photoUrl, zoneAreaM2 } from "@/lib/utils";
import { MapPinned } from "lucide-react";

export function ZoneManager({ zones }: { zones: ZoneWithCount[] }) {
  return (
    <>
      <div className="flex justify-end">
        <Link
          href="/zonas/nueva"
          className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-cream shadow-card transition active:scale-[0.98] hover:bg-ink/85 sm:w-auto sm:rounded-full sm:py-2.5"
        >
          <svg className="h-4 w-4 text-gold-soft" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Nueva zona
        </Link>
      </div>

      {zones.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={MapPinned}
            title="Aún no hay zonas"
            description="Crea la primera ubicación física de la parroquia para empezar a clasificar el inventario."
          />
        </div>
      ) : (
        <ul className="mt-4 grid gap-3 sm:mt-6 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {zones.map((z) => {
            const zPhoto = photoUrl(z.photoId);
            const dims = formatZoneDimensions(z);
            const area = zoneAreaM2(z);
            return (
              <li
                key={z.id}
                className="group relative flex flex-col overflow-hidden rounded-3xl border border-line bg-cream shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift"
              >
                <PhotoFrame
                  src={zPhoto}
                  alt={`Fotografía de ${z.name}`}
                  aspect="wide"
                  imageClassName="group-hover:scale-[1.025]"
                  className="border-b border-line-soft"
                  overlay={
                    <span className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-ink/45 to-transparent" />
                  }
                />
                <span
                  className="absolute inset-x-0 top-0 z-10 h-1.5"
                  style={{ backgroundColor: z.color }}
                />

                {/* Acciones: navegan a páginas completas (sin ventanas flotantes) */}
                <div className="absolute right-3 top-3 z-20 flex gap-2">
                  <Link
                    href={`/zonas/${z.id}/editar`}
                    aria-label={`Editar ${z.name}`}
                    className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-white/40 bg-cream/95 text-ink-soft shadow-lift backdrop-blur-md transition active:scale-90 hover:text-ink"
                  >
                    <PencilLine className="h-4 w-4" />
                  </Link>
                  <Link
                    href={`/zonas/${z.id}/eliminar`}
                    aria-label={`Eliminar ${z.name}`}
                    className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-white/40 bg-cream/95 text-ink-soft shadow-lift backdrop-blur-md transition active:scale-90 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Link>
                </div>

                <div className="flex flex-1 flex-col p-4 sm:p-5">
                  <div className="-mt-9 flex items-start">
                    <span className="relative z-10 shrink-0 rounded-2xl border border-line-soft bg-cream p-1 shadow-lift">
                      <ZoneIcon icon={z.icon} color={z.color} size="lg" />
                    </span>
                  </div>
                  <h3 className="mt-4 font-display text-xl font-semibold tracking-tight text-ink">
                    {z.name}
                  </h3>
                  <p className="mt-1 line-clamp-2 min-h-8 text-xs leading-relaxed text-ink-soft">
                    {z.description ?? "Sin descripción."}
                  </p>

                  {dims && (
                    <p className="mt-2.5 flex items-center gap-1.5 rounded-xl border border-line bg-white/60 px-2.5 py-1.5 text-[0.68rem] font-semibold text-ink-soft">
                      <Ruler className="h-3.5 w-3.5 shrink-0 text-gold-deep" />
                      <span className="truncate">
                        {dims}
                        {area && (
                          <span className="ml-1.5 text-gold-deep">· {area} m²</span>
                        )}
                      </span>
                    </p>
                  )}

                  <div className="mt-4 flex items-end justify-between border-t border-line-soft pt-3.5">
                    <p className="text-xs text-ink-soft">
                      <span className="font-display text-2xl font-semibold text-ink">
                        {z.itemCount}
                      </span>{" "}
                      activos · {z.unitCount} uds.
                      {z.trashCount > 0 && (
                        <span className="block text-[0.65rem] text-red-600">
                          {z.trashCount} en papelera
                        </span>
                      )}
                    </p>
                    <div className="flex flex-col items-end gap-1.5">
                      <Link
                        href={`/inventario?zona=${z.id}`}
                        className="inline-flex items-center gap-1 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-gold-deep transition hover:text-gold"
                      >
                        Ver
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                      {z.itemCount > 0 && (
                        <Link
                          href={`/zonas/${z.id}/etiquetas`}
                          className="inline-flex min-h-9 items-center gap-1 rounded-full border border-line bg-white px-2.5 text-[0.62rem] font-bold text-ink transition hover:border-gold/40 hover:text-gold-deep"
                          title={`Imprimir las etiquetas QR de esta zona (una por unidad, numeradas)`}
                        >
                          <QrCode className="h-3 w-3 text-gold-deep" />
                          Etiquetas QR
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
