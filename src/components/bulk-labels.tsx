"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

export function BulkLabels({
  items,
  baseUrl,
}: {
  items: { id: number; code: string; name: string }[];
  baseUrl: string;
}) {
  return (
    <div className="min-h-dvh bg-white">
      <div className="sheet-screen-only sticky top-0 flex items-center gap-3 bg-ink p-3">
        <Link href="/inventario/lotes" className="text-xs font-semibold text-cream">
          <ArrowLeft className="mr-1 inline h-4 w-4" />
          Volver
        </Link>
        <span className="flex-1 text-xs text-cream/60">{items.length} etiquetas</span>
        <button
          onClick={() => window.print()}
          className="cursor-pointer rounded-full bg-gold px-4 py-2 text-xs font-bold"
        >
          <Printer className="mr-1 inline h-4 w-4" />
          Imprimir
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2 p-[6mm]">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex min-h-[58mm] flex-col items-center justify-center border border-dashed border-stone-400 p-3 text-center"
          >
            <p className="mb-2 text-[8px] uppercase tracking-[2px]">
              Parroquia Santa Bárbara
            </p>
            <QRCodeSVG value={`${baseUrl}/escaner?code=${item.code}`} size={86} />
            <p className="mt-2 font-mono text-sm font-bold tracking-widest">{item.code}</p>
            <p className="mt-1 line-clamp-2 text-[10px] font-semibold">{item.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
