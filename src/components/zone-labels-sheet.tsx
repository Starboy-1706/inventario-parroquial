"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface ZoneLabelItem {
  id: number;
  code: string;
  name: string;
  quantity: number;
  itemType: string;
}

const LAYOUTS = [
  { cols: 3, perPage: 24, qr: 72, codeSize: 11, nameSize: 8, label: "24 pequeñas" },
  { cols: 3, perPage: 15, qr: 90, codeSize: 13, nameSize: 9, label: "15 medianas" },
  { cols: 2, perPage: 8, qr: 110, codeSize: 16, nameSize: 11, label: "8 grandes" },
] as const;

export function ZoneLabelsSheet({
  zoneName,
  zoneColor,
  items,
  parishName,
  baseUrl,
}: {
  zoneName: string;
  zoneColor: string;
  items: ZoneLabelItem[];
  parishName: string;
  baseUrl: string;
}) {
  const [layoutIdx, setLayoutIdx] = useState(1);
  const layout = LAYOUTS[layoutIdx];

  function chunk<T>(arr: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  }

  const pages = chunk(items, layout.perPage);

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
        <Link
          href="/zonas"
          className="inline-flex items-center gap-2 text-xs font-semibold text-ink-soft"
        >
          <ArrowLeft className="h-4 w-4" /> Volver a zonas
        </Link>
        <div className="mt-8 rounded-3xl border border-dashed border-line bg-cream p-12 text-center">
          <QrCode className="mx-auto h-10 w-10 text-ink-faint" />
          <h1 className="mt-3 font-display text-2xl font-semibold text-ink">
            {zoneName} no tiene artículos
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Da de alta artículos en esta zona para generar sus etiquetas QR.
          </p>
          <Link
            href="/inventario/nuevo"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-cream"
          >
            Dar de alta un artículo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-paper">
      {/* ---------- Barra de control (no se imprime) ---------- */}
      <div className="no-print sticky top-0 z-20 border-b border-white/10 bg-ink px-4 py-3">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-3">
          <Link
            href="/zonas"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-cream transition hover:bg-white/10 sm:px-3 sm:py-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Volver</span>
          </Link>
          <span className="hidden text-xs text-cream/60 sm:block">
            {items.length} etiquetas · {zoneName}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden overflow-hidden rounded-full border border-white/20 sm:flex">
              {LAYOUTS.map((l, i) => (
                <button
                  key={l.perPage}
                  onClick={() => setLayoutIdx(i)}
                  className={`cursor-pointer px-3 py-2 text-[0.65rem] font-bold transition ${
                    layoutIdx === i ? "bg-gold text-ink" : "text-cream/60 hover:bg-white/10"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => window.print()}
              className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-gold px-4 py-2 text-xs font-bold text-ink shadow-lift transition hover:bg-gold-soft"
            >
              <Printer className="h-4 w-4" strokeWidth={2.2} />
              Imprimir {items.length} etiquetas
            </button>
          </div>
        </div>
      </div>

      {/* ---------- Selector móvil de formato ---------- */}
      <div className="no-print flex gap-1.5 overflow-x-auto px-4 pb-2 pt-3 sm:hidden">
        {LAYOUTS.map((l, i) => (
          <button
            key={l.perPage}
            onClick={() => setLayoutIdx(i)}
            className={`shrink-0 cursor-pointer rounded-full border px-3.5 py-2 text-xs font-semibold transition ${
              layoutIdx === i
                ? "border-ink bg-ink text-cream"
                : "border-line bg-cream text-ink-soft"
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>

      <p className="no-print px-4 pb-2 pt-1 text-center text-[0.65rem] text-ink-soft sm:pb-3">
        Vista previa A4 · las líneas punteadas son guías de corte · para PDF
        elige «Guardar como PDF» en el diálogo de impresión
      </p>

      {/* ---------- Hoja A4 ---------- */}
      <div className="px-4 pb-10 print:p-0">
        {pages.map((pageItems, pageIndex) => (
          <div
            key={pageIndex}
            className="mx-auto mb-4 max-w-[784px] break-after-page bg-white shadow-lift print:mb-0 print:shadow-none"
          >
            {/* Encabezado de zona en cada hoja */}
            <div
              className="flex items-center gap-3 border-b-2 px-6 py-3"
              style={{ borderColor: zoneColor }}
            >
              <span
                className="inline-block h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: zoneColor }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-[0.65rem] font-bold uppercase tracking-widest text-stone-500">
                  {parishName}
                </p>
                <p className="truncate font-serif text-sm font-bold text-stone-900">
                  {zoneName}
                </p>
              </div>
              <span className="shrink-0 font-mono text-[0.6rem] text-stone-400">
                {pageIndex + 1}/{pages.length}
              </span>
            </div>

            {/* Rejilla de etiquetas */}
            <div
              className="grid gap-2 p-4"
              style={{
                gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))`,
              }}
            >
              {pageItems.map((item) => (
                <div
                  key={item.id}
                  className="flex min-h-[52mm] flex-col items-center justify-center border border-dashed border-stone-300 p-2 text-center"
                >
                  <p className="mb-1.5 font-sans text-[0.55rem] uppercase tracking-[0.15em] text-stone-500">
                    {parishName}
                  </p>
                  <QRCodeSVG
                    value={`${baseUrl}/escaner?code=${item.code}`}
                    size={layout.qr}
                    level="M"
                    fgColor="#000000"
                    bgColor="#ffffff"
                  />
                  <p
                    className="mt-2 font-mono font-bold tracking-widest"
                    style={{ fontSize: `${layout.codeSize}px` }}
                  >
                    {item.code}
                  </p>
                  <p
                    className="mt-0.5 line-clamp-2 font-sans font-semibold leading-tight"
                    style={{ fontSize: `${layout.nameSize}px` }}
                  >
                    {item.name}
                  </p>
                  {item.itemType === "CONTABLE" && item.quantity > 1 && (
                    <p className="mt-0.5 text-[0.55rem] font-medium text-stone-500">
                      {item.quantity} uds.
                    </p>
                  )}
                </div>
              ))}
              {/* Rellenar huecos vacíos de la última página */}
              {pageIndex === pages.length - 1 &&
                Array.from({
                  length:
                    layout.perPage -
                    pageItems.length -
                    (layout.perPage - pageItems.length) % layout.cols +
                    ((layout.perPage - pageItems.length) % layout.cols === 0
                      ? 0
                      : layout.cols -
                        ((layout.perPage - pageItems.length) % layout.cols)),
                })
                  .slice(0, layout.perPage - pageItems.length)
                  .map((_, i) => (
                    <div
                      key={`pad-${i}`}
                      className="min-h-[52mm] border border-dashed border-stone-200"
                    />
                  ))}
            </div>

            {/* Pie de página */}
            <div className="border-t px-6 py-2 text-center">
              <p className="font-sans text-[0.55rem] text-stone-400">
                Generado automáticamente · {parishName} ·{" "}
                {new Date().toLocaleDateString("es-ES")}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
