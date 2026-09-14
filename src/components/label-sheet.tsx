"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, Ruler, Scissors } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import type { Item, Zone } from "@/db/schema";
import { chunkPages, expandLabelUnits } from "@/lib/labels";
import { formatItemDimensions } from "@/lib/utils";

/* ---------- Diseños en tamaño CARTA (216 × 279 mm, márgenes 10 mm) ---------- */
const OPTIONS = [
  { perPage: 1, cols: 1, rows: 1, qr: 176, label: "1 por hoja (grande)" },
  { perPage: 4, cols: 2, rows: 2, qr: 106, label: "4 por hoja (medianas)" },
  { perPage: 9, cols: 3, rows: 3, qr: 62, label: "9 por hoja (pequeñas)" },
] as const;

type Option = (typeof OPTIONS)[number];

function Label({
  code,
  name,
  unit,
  unitTotal,
  zone,
  url,
  opt,
  description,
  dimensions,
  spec,
  locationPath,
  parishName,
}: {
  code: string;
  name: string;
  unit: number | null;
  unitTotal: number | null;
  zone: Zone;
  url: string;
  opt: Option;
  description?: string | null;
  dimensions?: string | null;
  /** "Marca · Modelo" para la etiqueta grande. */
  spec?: string | null;
  /** Ruta de ubicación exacta (armario → balda → caja). */
  locationPath?: string | null;
  parishName: string;
}) {
  const big = opt.perPage === 1;
  const medium = opt.perPage === 4;
  return (
    <div
      className="label-cell"
      style={{
        border: "1.5px dashed #9ca3af",
        padding: big ? "9mm" : medium ? "4mm" : "2.5mm",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: big ? "3.5mm" : "1.8mm",
        fontFamily: "Georgia, 'Times New Roman', serif",
        background: "#ffffff",
        textAlign: "center",
        overflow: "hidden",
        boxSizing: "border-box",
        height: "100%",
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: big ? 12 : 8,
          letterSpacing: big ? 3 : 1.6,
          textTransform: "uppercase",
          color: "#6b7280",
          lineHeight: 1.2,
        }}
      >
        {parishName}
      </p>

      {/* Nombre de la zona — siempre visible en la etiqueta */}
      <p
        style={{
          margin: 0,
          fontSize: big ? 13 : 8.5,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: big ? 2 : 1,
          color: "#ffffff",
          background: zone.color || "#211c12",
          padding: big ? "2mm 5mm" : "1mm 3mm",
          borderRadius: 999,
          maxWidth: "100%",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {zone.name}
      </p>

      <QRCodeSVG value={url} size={opt.qr} level="M" fgColor="#000000" bgColor="#ffffff" />

      <p
        style={{
          margin: 0,
          fontFamily: "ui-monospace, 'Courier New', monospace",
          fontWeight: 700,
          fontSize: big ? 26 : medium ? 15 : 12,
          letterSpacing: big ? 6 : 2,
        }}
      >
        {code}
      </p>
      <p
        style={{
          margin: 0,
          fontSize: big ? 17 : medium ? 11 : 9,
          fontWeight: 600,
          lineHeight: 1.25,
          maxWidth: "100%",
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: big ? 3 : 2,
          WebkitBoxOrient: "vertical",
        }}
      >
        {name}
      </p>

      {big && spec && (
        <p
          style={{
            margin: 0,
            fontSize: 12,
            fontWeight: 700,
            color: "#211c12",
            letterSpacing: 0.4,
          }}
        >
          {spec}
        </p>
      )}
      {big && locationPath && (
        <p style={{ margin: 0, fontSize: 10.5, color: "#6b7280" }}>📍 {locationPath}</p>
      )}
      {big && description && (
        <p
          style={{
            margin: 0,
            fontSize: 11,
            lineHeight: 1.35,
            color: "#57534e",
            maxWidth: "62ch",
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
          }}
        >
          {description}
        </p>
      )}
      {big && dimensions && (
        <p
          style={{
            margin: 0,
            fontSize: 11,
            color: "#6b7280",
            fontFamily: "ui-monospace, monospace",
          }}
        >
          {dimensions}
        </p>
      )}

      {/* Numeración de ejemplares para artículos acumulables */}
      {unit !== null && unitTotal !== null && (
        <p
          style={{
            margin: 0,
            fontSize: big ? 14 : 9,
            fontWeight: 800,
            letterSpacing: 1.5,
            textTransform: "uppercase",
            color: "#211c12",
            background: "#f3eee1",
            border: "1px solid #d6cbb2",
            padding: big ? "1.6mm 5mm" : "0.8mm 2.8mm",
            borderRadius: 999,
          }}
        >
          Ejemplar {unit} de {unitTotal}
        </p>
      )}
    </div>
  );
}

export function LabelSheet({
  item,
  zone,
  baseUrl,
  parishName = "Parroquia Santa Bárbara",
  locationPath = null,
}: {
  item: Item;
  zone: Zone;
  baseUrl: string;
  parishName?: string;
  locationPath?: string | null;
}) {
  const [optIdx, setOptIdx] = useState(0);
  const opt = OPTIONS[optIdx];
  const url = `${baseUrl}/escaner?code=${item.code}`;
  const dimensions = formatItemDimensions(item);
  const spec = [item.brand, item.model].filter(Boolean).join(" · ") || null;

  /*
   * Artículo acumulable → tantas etiquetas como unidades existan,
   * numeradas 1/N…N/N. Pieza única → `perPage` copias idénticas.
   */
  const { units, truncated } = useMemo(() => {
    if (item.itemType === "CONTABLE") {
      return expandLabelUnits([
        { id: item.id, code: item.code, name: item.name, itemType: item.itemType, quantity: item.quantity },
      ]);
    }
    return {
      units: Array.from({ length: opt.perPage }, (_, i) => ({
        key: `copy-${i}`,
        id: item.id,
        code: item.code,
        name: item.name,
        unit: null,
        unitTotal: null,
      })),
      truncated: 0,
    };
  }, [item, opt.perPage]);

  const pages = useMemo(() => chunkPages(units, opt.perPage), [units, opt.perPage]);
  const totalLabels = units.length;

  // Abrir el diálogo de impresión automáticamente al cargar
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        window.print();
      } catch {
        /* el botón sigue disponible */
      }
    }, 600);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-dvh bg-paper">
      {/* ---------- Barra de control (solo pantalla) ---------- */}
      <div className="sheet-screen-only sticky top-0 z-10 border-b border-white/10 bg-ink px-4 py-3">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-3">
          <Link
            href={`/inventario/${item.id}`}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-cream transition hover:bg-white/10"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver a la ficha
          </Link>
          <span className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-gold-soft">
            Etiqueta · {item.code} · {totalLabels} etiqueta{totalLabels === 1 ? "" : "s"}
          </span>
          <span className="flex-1" />
          <div className="flex overflow-hidden rounded-full border border-white/20">
            {OPTIONS.map((o, i) => (
              <button
                key={o.perPage}
                onClick={() => setOptIdx(i)}
                className={`cursor-pointer px-3 py-2 text-[0.68rem] font-bold transition ${
                  optIdx === i
                    ? "bg-gold text-ink"
                    : "bg-transparent text-cream/70 hover:bg-white/10"
                }`}
              >
                {o.perPage} por hoja
              </button>
            ))}
          </div>
          <button
            onClick={() => window.print()}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-gold px-4 py-2 text-xs font-bold text-ink shadow-lift transition hover:bg-gold-soft active:scale-95"
          >
            <Printer className="h-3.5 w-3.5" strokeWidth={2.2} />
            Imprimir ahora
          </button>
        </div>
      </div>

      {/* ---------- Notas (solo pantalla) ---------- */}
      <div className="sheet-screen-only mx-auto max-w-4xl space-y-1 px-4 pt-2">
        <p className="flex items-center justify-center gap-2 py-2 text-[0.66rem] text-ink-soft">
          <Scissors className="h-3 w-3 text-gold" />
          Papel carta (216 × 279 mm) · las líneas punteadas son guías de corte ·
          para PDF: elige «Guardar como PDF» en el diálogo
        </p>
        {item.itemType === "CONTABLE" && (
          <p className="pb-1 text-center text-[0.66rem] font-semibold text-gold-deep">
            <Ruler className="mr-1 inline h-3 w-3" />
            Artículo acumulable: se imprimen {totalLabels} etiquetas numeradas,
            una por unidad existente.
            {truncated > 0 && " (cantidad recortada por seguridad a 300)"}
          </p>
        )}
      </div>

      {/* ---------- Hojas carta ---------- */}
      <div className="mx-auto max-w-[816px] px-4 pb-8 print:max-w-none print:p-0">
        {pages.map((pageUnits, pageIndex) => (
          <div
            key={pageIndex}
            className="sheet-page sheet-shadow mx-auto mb-4 bg-white shadow-lift print:mb-0"
            style={{ width: "100%", boxSizing: "border-box" }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${opt.cols}, 1fr)`,
                gridTemplateRows: `repeat(${opt.rows}, 1fr)`,
                gap: opt.perPage === 1 ? "0mm" : "3mm",
                padding: "4mm",
                height: "257mm",
                boxSizing: "border-box",
              }}
            >
              {pageUnits.map((u) => (
                <Label
                  key={u.key}
                  code={u.code}
                  name={u.name}
                  unit={u.unit}
                  unitTotal={u.unitTotal}
                  zone={zone}
                  url={url}
                  opt={opt}
                  description={item.description}
                  dimensions={dimensions}
                  spec={spec}
                  locationPath={locationPath}
                  parishName={parishName}
                />
              ))}
              {/* Huecos vacíos de la última página */}
              {Array.from({ length: opt.perPage - pageUnits.length }).map((_, i) => (
                <div
                  key={`pad-${pageIndex}-${i}`}
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
