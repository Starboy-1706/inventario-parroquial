"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, QrCode, Ruler } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { chunkPages, expandLabelUnits, type LabelUnit } from "@/lib/labels";

interface ZoneLabelItem {
  id: number;
  code: string;
  name: string;
  quantity: number;
  itemType: string;
}

/* ---------- Diseños en tamaño CARTA (216 × 279 mm, márgenes 10 mm) ---------- */
const LAYOUTS = [
  { cols: 3, rows: 7, perPage: 21, qr: 52, codeSize: 10, nameSize: 8, label: "21 pequeñas" },
  { cols: 3, rows: 4, perPage: 12, qr: 76, codeSize: 12.5, nameSize: 9, label: "12 medianas" },
  { cols: 2, rows: 3, perPage: 6, qr: 100, codeSize: 16, nameSize: 11, label: "6 grandes" },
] as const;

function ZoneLabel({
  unit,
  baseUrl,
  parishName,
  zoneName,
  zoneColor,
  layout,
}: {
  unit: LabelUnit;
  baseUrl: string;
  parishName: string;
  zoneName: string;
  zoneColor: string;
  layout: (typeof LAYOUTS)[number];
}) {
  const big = layout.perPage === 6;
  return (
    <div
      className="label-cell"
      style={{
        border: "1.5px dashed #9ca3af",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: big ? "2.2mm" : "1.4mm",
        padding: big ? "3mm" : "1.8mm",
        textAlign: "center",
        fontFamily: "Georgia, 'Times New Roman', serif",
        background: "#ffffff",
        overflow: "hidden",
        boxSizing: "border-box",
        height: "100%",
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: big ? 9 : 7,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          color: "#6b7280",
        }}
      >
        {parishName}
      </p>

      {/* Nombre de la zona — impreso dentro de cada etiqueta */}
      <p
        style={{
          margin: 0,
          fontSize: big ? 10 : 7.5,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 1,
          color: "#ffffff",
          background: zoneColor || "#211c12",
          padding: big ? "1.2mm 3.5mm" : "0.7mm 2.4mm",
          borderRadius: 999,
          maxWidth: "100%",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {zoneName}
      </p>

      <QRCodeSVG
        value={`${baseUrl}/escaner?code=${unit.code}`}
        size={layout.qr}
        level="M"
        fgColor="#000000"
        bgColor="#ffffff"
      />
      <p
        className="font-mono"
        style={{
          margin: 0,
          fontWeight: 700,
          fontSize: `${layout.codeSize}px`,
          letterSpacing: 2,
        }}
      >
        {unit.code}
      </p>
      <p
        style={{
          margin: 0,
          fontSize: `${layout.nameSize}px`,
          fontWeight: 600,
          lineHeight: 1.18,
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
        }}
      >
        {unit.name}
      </p>

      {/* Numeración: etiqueta por unidad existente */}
      {unit.unit !== null && unit.unitTotal !== null && (
        <p
          style={{
            margin: 0,
            fontSize: big ? 10 : 7.5,
            fontWeight: 800,
            letterSpacing: 1.2,
            textTransform: "uppercase",
            color: "#211c12",
            background: "#f3eee1",
            border: "1px solid #d6cbb2",
            padding: big ? "1mm 3mm" : "0.6mm 2.2mm",
            borderRadius: 999,
          }}
        >
          Ejemplar {unit.unit} de {unit.unitTotal}
        </p>
      )}
    </div>
  );
}

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

  /* Acumulables → tantas etiquetas numeradas como unidades existan. */
  const { units, truncated } = useMemo(() => expandLabelUnits(items), [items]);
  const pages = useMemo(() => chunkPages(units, layout.perPage), [units, layout.perPage]);

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
            {units.length} etiquetas · {zoneName} · carta
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
              Imprimir {units.length} etiquetas
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
        Vista previa en tamaño carta (216 × 279 mm) · las líneas punteadas son
        guías de corte · para PDF elige «Guardar como PDF» en el diálogo de impresión
      </p>
      {truncated > 0 && (
        <p className="no-print px-4 pb-2 text-center text-[0.66rem] font-semibold text-amber-700">
          <Ruler className="mr-1 inline h-3 w-3" />
          Algún artículo supera 300 unidades: sus etiquetas se han recortado a 300 por seguridad.
        </p>
      )}

      {/* ---------- Hojas carta ---------- */}
      <div className="px-4 pb-10 print:p-0">
        {pages.map((pageUnits, pageIndex) => (
          <div
            key={pageIndex}
            className="sheet-page mx-auto mb-4 max-w-[816px] bg-white shadow-lift print:mb-0 print:max-w-none print:shadow-none"
            style={{ boxSizing: "border-box" }}
          >
            {/* Encabezado de zona en cada hoja */}
            <div
              className="flex items-center gap-3 border-b-2 px-6 py-2.5"
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
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${layout.cols}, 1fr)`,
                gridTemplateRows: `repeat(${layout.rows}, 1fr)`,
                gap: "2.5mm",
                padding: "3.5mm",
                height: "243mm",
                boxSizing: "border-box",
              }}
            >
              {pageUnits.map((u) => (
                <ZoneLabel
                  key={u.key}
                  unit={u}
                  baseUrl={baseUrl}
                  parishName={parishName}
                  zoneName={zoneName}
                  zoneColor={zoneColor}
                  layout={layout}
                />
              ))}
              {/* Huecos vacíos de la última página */}
              {pageIndex === pages.length - 1 &&
                Array.from({ length: layout.perPage - pageUnits.length }).map((_, i) => (
                  <div
                    key={`pad-${i}`}
                    style={{ border: "1px dashed #e7e5e4", boxSizing: "border-box" }}
                  />
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
