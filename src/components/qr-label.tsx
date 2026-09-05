"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui";

export function QrLabel({
  itemId,
  code,
}: {
  itemId: number;
  code: string;
}) {
  const [url, setUrl] = useState(`/escaner?code=${code}`);

  useEffect(() => {
    setUrl(`${window.location.origin}/escaner?code=${code}`);
  }, [code]);

  return (
    <div className="no-print rounded-3xl border border-line bg-cream p-6 text-center shadow-card">
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-ink-soft">
        Etiqueta escaneable
      </p>
      <div className="mx-auto mt-4 w-fit rounded-2xl border border-line bg-white p-4 shadow-card">
        <QRCodeSVG
          value={url}
          size={176}
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
        Escanea con la cámara en el módulo de escáner
      </p>
      <Link href={`/inventario/${itemId}/etiqueta`} className="mt-4 inline-block">
        <Button variant="outline" size="sm">
          <Printer className="h-3.5 w-3.5" />
          Imprimir etiqueta
        </Button>
      </Link>
    </div>
  );
}
