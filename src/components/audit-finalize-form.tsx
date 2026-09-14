"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ClipboardCheck,
  Loader2,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui";
import { secureFetch } from "@/lib/secure-fetch";

/** Finalización del recuento como página completa (sin ventanas flotantes). */
export function AuditFinalizeForm({
  sessionId,
  zoneName,
  zoneColor,
  verifiedCount,
  missingCount,
  discrepanciesCount,
}: {
  sessionId: number;
  zoneName: string;
  zoneColor: string;
  verifiedCount: number;
  missingCount: number;
  discrepanciesCount: number;
}) {
  const router = useRouter();
  const [autoAdjustStock, setAutoAdjustStock] = useState(true);
  const [finalizing, setFinalizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function finalizeSession(action: "COMPLETADO" | "CANCELAR") {
    setFinalizing(true);
    setError(null);
    try {
      const res = await secureFetch(`/api/audit/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, autoAdjust: autoAdjustStock }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No se pudo cerrar la sesión.");
        return;
      }
      router.push(`/recuento/${sessionId}`);
      router.refresh();
    } catch {
      setError("Error de conexión. Inténtalo de nuevo.");
    } finally {
      setFinalizing(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8 sm:px-8 sm:py-14">
      <Link
        href={`/recuento/${sessionId}`}
        className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft transition hover:text-ink active:scale-95"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver al recuento en vivo
      </Link>

      <div className="mt-5 animate-fade-up rounded-3xl border border-line bg-cream p-6 shadow-card sm:p-8">
        <div className="flex items-center gap-3">
          <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: zoneColor }} />
          <div>
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-gold-deep">
              Cierre de recuento
            </p>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              Finalizar: {zoneName}
            </h1>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-line bg-white/70 p-4 text-sm leading-relaxed">
          <p className="font-bold text-ink">Resumen del balance actual:</p>
          <ul className="mt-2 space-y-1 text-xs text-ink-soft">
            <li>• Artículos verificados al 100%: <strong>{verifiedCount}</strong></li>
            <li>• Artículos no encontrados (faltantes): <strong>{missingCount}</strong></li>
            <li>• Discrepancias de cantidad / fuera de zona: <strong>{discrepanciesCount}</strong></li>
          </ul>
        </div>

        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-gold/30 bg-gold/10 p-3.5">
          <input
            type="checkbox"
            checked={autoAdjustStock}
            onChange={(e) => setAutoAdjustStock(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded text-gold"
          />
          <span className="text-xs leading-relaxed text-ink">
            <strong>Ajustar existencias automáticamente en el inventario</strong>{" "}
            con los números reales contados durante este recuento.
          </span>
        </label>

        {error && (
          <p className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-2 border-t border-line-soft pt-5 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={() => void finalizeSession("CANCELAR")}
            disabled={finalizing}
          >
            <XCircle className="h-4 w-4" />
            Cancelar sesión sin guardar
          </Button>
          <Button
            type="button"
            variant="dark"
            onClick={() => void finalizeSession("COMPLETADO")}
            disabled={finalizing}
          >
            {finalizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4 text-gold-soft" />}
            Guardar y cerrar informe
          </Button>
        </div>
      </div>
    </div>
  );
}
