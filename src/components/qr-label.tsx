"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui";
import { LogoMark } from "@/components/logo";

export function QrLabel({
  code,
  name,
  zoneName,
}: {
  code: string;
  name: string;
  zoneName: string;
}) {
  const [url, setUrl] = useState(`/escaner?code=${code}`);

  useEffect(() => {
    setUrl(`${window.location.origin}/escaner?code=${code}`);
  }, [code]);

  return (
    <>
      {/* Tarjeta en pantalla */}
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
          Escanea con la cámara o con el módulo de escáner
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => window.print()}
        >
          <Printer className="h-3.5 w-3.5" />
          Imprimir etiqueta
        </Button>
      </div>

      {/* Versión de impresión (solo visible al imprimir) */}
      <div className="print-area">
        <div
          style={{
            border: "2px solid #211c12",
            borderRadius: 16,
            padding: "28px 32px",
            textAlign: "center",
            fontFamily: "Georgia, serif",
            maxWidth: 340,
          }}
        >
          <div style={{ display: "flex", justifyContent: "center" }}>
            <LogoMark className="h-8 w-8" />
          </div>
          <p
            style={{
              margin: "10px 0 2px",
              fontSize: 12,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: "#6f6552",
            }}
          >
            Parroquia Santa Bárbara
          </p>
          <div style={{ margin: "14px auto", width: "fit-content" }}>
            <QRCodeSVG value={url} size={200} level="M" fgColor="#000" bgColor="#fff" />
          </div>
          <p
            style={{
              fontFamily: "monospace",
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: 6,
              margin: "8px 0 4px",
            }}
          >
            {code}
          </p>
          <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{name}</p>
          <p style={{ fontSize: 12, color: "#6f6552", margin: "4px 0 0" }}>
            {zoneName}
          </p>
        </div>
      </div>
    </>
  );
}
