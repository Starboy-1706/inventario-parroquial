"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, Ruler } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { chunkPages, expandLabelUnits, type LabelUnit } from "@/lib/labels";

type BulkItem = {
  id: number;
  code: string;
  name: string;
  itemType: string;
  quantity: number;
  zoneName: string;
  zoneColor: string;
};

type BulkUnit = LabelUnit & { zoneName: string; zoneColor: string };

/* ---------- Rejilla carta: 3 columnas × 5 filas = 15 por hoja ---------- */
const COLS = 3;
const ROWS = 5;
const PER_PAGE = COLS * ROWS;

function BulkLabel({
  unit,
  baseUrl,
  parishName,
}: {
  unit: BulkUnit;
  baseUrl: string;
  parishName: string;
}) {
  return (
    <div
      className="label-cell"
      style={{
        border: "1.5px dashed #9ca3af",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1.6mm",
        padding: "2.5mm",
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
          fontSize: 7.5,
          letterSpacing: 1.6,
          textTransform: "uppercase",
          color: "#6b7280",
        }}
      >
        {parishName}
      </p>
      {/* Nombre de la zona en cada etiqueta */}
      <p
        style={{
          margin: 0,
          fontSize: 8,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 1,
          color: "#ffffff",
          background: unit.zoneColor || "#211c12",
          padding: "0.8mm 3mm",
          borderRadius: 999,
          maxWidth: "100%",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {unit.zoneName}
      </p>
      <QRCodeSVG
        value={`${baseUrl}/escaner?code=${unit.code}`}
        size={76}
        level="M"
        fgColor="#000000"
        bgColor="#ffffff"
      />
      <p
        style={{
          margin: 0,
          fontFamily: "ui-monospace, monospace",
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: 2,
        }}
      >
        {unit.code}
      </p>
      <p
        style={{
          margin: 0,
          fontSize: 9,
          fontWeight: 600,
          lineHeight: 1.2,
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
        }}
      >
        {unit.name}
      </p>
      {unit.unit !== null && unit.unitTotal !== null && (
        <p
          style={{
            margin: 0,
            fontSize: 8.5,
            fontWeight: 800,
            letterSpacing: 1.2,
            textTransform: "uppercase",
            color: "#211c12",
            background: "#f3eee1",
            border: "1px solid #d6cbb2",
            padding: "0.7mm 2.6mm",
            borderRadius: 999,
          }}
        >
          Ejemplar {unit.unit} de {unit.unitTotal}
        </p>
      )}
    </div>
  );
}

export function BulkLabels({
  items,
  baseUrl,
  parishName,
}: {
  items: BulkItem[];
  baseUrl: string;
  parishName: string;
}) {
  /* Acumulables → una etiqueta numerada por unidad existente. */
  const { units, truncated } = useMemo(() => {
    const byId = new Map(items.map((i) => [i.id, i]));
    const { units, truncated } = expandLabelUnits(items);
    return {
      units: units.map((u) => ({
        ...u,
        zoneName: byId.get(u.id)?.zoneName ?? "",
        zoneColor: byId.get(u.id)?.zoneColor ?? "#211c12",
      })),
      truncated,
    };
  }, [items]);

  const pages = useMemo(() => chunkPages(units, PER_PAGE), [units]);

  return (
    <div className="min-h-dvh bg-paper">
      <div className="sheet-screen-only sticky top-0 z-10 border-b border-white/10 bg-ink px-4 py-3">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <Link
            href="/inventario/lotes"
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-cream transition hover:bg-white/10"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver
          </Link>
          <span className="flex-1 text-xs text-cream/60">
            {units.length} etiquetas · papel carta
          </span>
          <button
            onClick={() => window.print()}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-gold px-4 py-2 text-xs font-bold text-ink shadow-lift transition hover:bg-gold-soft"
          >
            <Printer className="h-3.5 w-3.5" strokeWidth={2.2} />
            Imprimir
          </button>
        </div>
      </div>

      {truncated > 0 && (
        <p className="sheet-screen-only mx-auto max-w-4xl px-4 pt-3 text-center text-[0.66rem] font-semibold text-amber-700">
          <Ruler className="mr-1 inline h-3 w-3" />
          Algún artículo supera 300 unidades: sus etiquetas se han recortado a 300 por seguridad.
        </p>
      )}

      <div className="mx-auto max-w-[816px] px-4 py-6 print:max-w-none print:p-0">
        {pages.map((pageUnits, pageIndex) => (
          <div
            key={pageIndex}
            className="sheet-page sheet-shadow mx-auto mb-4 bg-white shadow-lift print:mb-0"
            style={{ boxSizing: "border-box" }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${COLS}, 1fr)`,
                gridTemplateRows: `repeat(${ROWS}, 1fr)`,
                gap: "3mm",
                padding: "4mm",
                height: "257mm",
                boxSizing: "border-box",
              }}
            >
              {pageUnits.map((u) => (
                <BulkLabel key={u.key} unit={u} baseUrl={baseUrl} parishName={parishName} />
              ))}
              {Array.from({ length: PER_PAGE - pageUnits.length }).map((_, i) => (
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
