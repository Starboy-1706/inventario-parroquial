"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { MapPin, Printer } from "lucide-react";
import { Button } from "@/components/ui";

export function QrLabel({
  itemId,
  code,
  zoneName,
  zoneColor,
  countableQuantity,
}: {
  itemId: number;
  code: string;
  zoneName?: string;
  zoneColor?: string;
  /** Si es acumulable, número de etiquetas numeradas que se imprimirán. */
  countableQuantity?: number;
}) {
  const [url, setUrl] = useState(`/escaner?code=${code}`);

  useEffect(() => {
    setUrl(`${window.location.origin}/escaner?code=${code}`);
  }, [code]);

  return (
    <div className="no-print rounded-2xl border border-line bg-cream p-4 text-center shadow-card sm:rounded-3xl sm:p-6">
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-ink-soft">
        Etiqueta escaneable
      </p>
      {zoneName && (
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.68rem] font-bold text-white"
          style={{ backgroundColor: zoneColor ?? "#211c12" }}
        >
          <MapPin className="h-3 w-3" />
          {zoneName}
        </p>
      )}
      <div className="mx-auto mt-4 w-fit rounded-2xl border border-line bg-white p-4 shadow-card">
        <QRCodeSVG
          value={url}
          size={160}
          level="M"
          fgColor="#211c12"
          bgColor="#ffffff"
          title={`Código ${code}`}
        />
      </div>
      <p className="mt-4 font-mono text-lg font-bold tracking-[0.2em] text-ink">
        {code}
      </p>
      <p className="mt-1 text-xs text-ink-soft">
        {countableQuantity && countableQuantity > 1
          ? `Al imprimir se generan ${countableQuantity} etiquetas numeradas, una por unidad`
          : "Escanea con la cámara en el módulo de escáner"}
      </p>
      <Link href={`/inventario/${itemId}/etiqueta`} className="mt-4 inline-block">
        <Button variant="outline" size="sm">
          <Printer className="h-3.5 w-3.5" />
          Imprimir en tamaño carta
        </Button>
      </Link>
    </div>
  );
}
