"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, Scissors } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import type { Item, Zone } from "@/db/schema";

const OPTIONS = [
  { count: 1, cols: 2, rows: 1, qr: 150, label: "1 etiqueta grande" },
  { count: 4, cols: 2, rows: 2, qr: 96, label: "4 etiquetas medianas" },
  { count: 9, cols: 3, rows: 3, qr: 60, label: "9 etiquetas pequeñas" },
] as const;

type Option = (typeof OPTIONS)[number];

function Label({
  item,
  zone,
  url,
  opt,
}: {
  item: Item;
  zone: Zone;
  url: string;
  opt: Option;
}) {
  const big = opt.count === 1;
  return (
    <div
      style={{
        border: "1.5px dashed #9ca3af",
        padding: big ? "10mm" : "5mm",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: big ? "4mm" : "2mm",
        fontFamily: "Georgia, 'Times New Roman', serif",
        background: "#ffffff",
        textAlign: "center",
        overflow: "hidden",
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: big ? 12 : 9,
          letterSpacing: big ? 3 : 2,
          textTransform: "uppercase",
          color: "#57534e",
        }}
      >
        Parroquia Santa Bárbara
      </p>
      <QRCodeSVG value={url} size={opt.qr} level="M" fgColor="#000000" bgColor="#ffffff" />
      <p
        style={{
          margin: 0,
          fontFamily: "ui-monospace, 'Courier New', monospace",
          fontWeight: 700,
          fontSize: big ? 26 : 15,
          letterSpacing: big ? 6 : 3,
        }}
      >
        {item.code}
      </p>
      <p style={{ margin: 0, fontSize: big ? 16 : 11, fontWeight: 600, lineHeight: 1.25 }}>
        {item.name}
      </p>
      <p style={{ margin: 0, fontSize: big ? 12 : 9, color: "#57534e" }}>{zone.name}</p>
      {item.itemType === "UNICO" && (
        <p
          style={{
            margin: 0,
            fontSize: big ? 10 : 8,
            textTransform: "uppercase",
            letterSpacing: 1.5,
            color: "#7c6f58",
          }}
        >
          Pieza única
        </p>
      )}
    </div>
  );
}

export function LabelSheet({ item, zone }: { item: Item; zone: Zone }) {
  const [optIdx, setOptIdx] = useState(0);
  const [origin, setOrigin] = useState("");
  const opt = OPTIONS[optIdx];
  const url = `${origin || "https://parroquia-santa-barbara"}/escaner?code=${item.code}`;

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

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
            Etiqueta · {item.code}
          </span>
          <span className="flex-1" />
          <div className="flex overflow-hidden rounded-full border border-white/20">
            {OPTIONS.map((o, i) => (
              <button
                key={o.count}
                onClick={() => setOptIdx(i)}
                className={`cursor-pointer px-3 py-2 text-[0.68rem] font-bold transition ${
                  optIdx === i
                    ? "bg-gold text-ink"
                    : "bg-transparent text-cream/70 hover:bg-white/10"
                }`}
              >
                {o.count} por hoja
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

      {/* ---------- Vista previa de la hoja A4 ---------- */}
      <div className="sheet-screen-only mx-auto max-w-4xl px-4 pt-2">
        <p className="flex items-center justify-center gap-2 py-2 text-[0.66rem] text-ink-soft">
          <Scissors className="h-3 w-3 text-gold" />
          Vista previa A4 · las líneas punteadas son guías de corte · para PDF: elige «Guardar como PDF» en el diálogo
        </p>
      </div>

      <div className="mx-auto max-w-4xl px-4 pb-8 print:p-0">
        <div
          className="sheet-shadow mx-auto bg-white shadow-lift"
          style={{
            width: "100%",
            maxWidth: "784px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${opt.cols}, 1fr)`,
              gap: "2mm",
              padding: "6mm",
            }}
          >
            {Array.from({ length: opt.count }).map((_, i) => (
              <Label key={i} item={item} zone={zone} url={url} opt={opt} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
