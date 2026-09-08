"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  HelpCircle,
  Loader2,
  PackageCheck,
  Plus,
  QrCode,
  RotateCcw,
  ScanLine,
  Sparkles,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import { Button, Field, Modal, inputCls } from "@/components/ui";
import { Scanner } from "@/components/scanner";
import { secureFetch } from "@/lib/secure-fetch";
import { formatDateTime, photoUrl } from "@/lib/utils";

type ChecklistItem = {
  id: number;
  itemId: number | null;
  scannedCode: string;
  expectedQuantity: number;
  scannedQuantity: number;
  status: "CORRECTO" | "FALTANTE" | "SOBRANTE" | "DISCREPANCIA_CANTIDAD" | "FUERA_DE_ZONA" | "DESCONOCIDO";
  scannedAt: string;
  notes: string | null;
  name: string;
  itemType: string;
  category: string;
  photoId: number | null;
};

type AuditDetail = {
  id: number;
  zoneId: number;
  zoneName: string;
  zoneColor: string;
  status: "EN_CURSO" | "COMPLETADO" | "CANCELADO";
  startedAt: string;
  completedAt: string | null;
  totalExpected: number;
  totalScanned: number;
  totalDiscrepancies: number;
  auditorName: string | null;
  notes: string | null;
  checklist: ChecklistItem[];
};

function beepSound(type: "ok" | "warn" | "error") {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";

    if (type === "ok") {
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);
      osc.start();
      osc.stop(ctx.currentTime + 0.16);
    } else {
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.28);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }
    osc.onended = () => void ctx.close();
  } catch {
    /* silent */
  }
}

export function AuditLive({ initialData }: { initialData: AuditDetail }) {
  const router = useRouter();
  const [data, setData] = useState<AuditDetail>(initialData);
  const [tab, setTab] = useState<"TODOS" | "CORRECTO" | "FALTANTE" | "DISCREPANCIAS">("TODOS");
  const [codeScanInput, setCodeScanInput] = useState("");
  const [qtyInput, setQtyInput] = useState(1);
  const [scanning, setScanning] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [lastFeedback, setLastFeedback] = useState<{ message: string; type: "ok" | "warn" | "error" } | null>(null);
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [autoAdjustStock, setAutoAdjustStock] = useState(true);
  const [finalizing, setFinalizing] = useState(false);

  const isOngoing = data.status === "EN_CURSO";

  const totalExpected = data.checklist.filter((c) => c.expectedQuantity > 0).length;
  const verifiedCount = data.checklist.filter((c) => c.status === "CORRECTO").length;
  const missingCount = data.checklist.filter((c) => c.status === "FALTANTE").length;
  const discrepanciesCount = data.checklist.filter(
    (c) => c.status === "DISCREPANCIA_CANTIDAD" || c.status === "FUERA_DE_ZONA" || c.status === "DESCONOCIDO",
  ).length;

  const progressPercent =
    totalExpected > 0 ? Math.min(100, Math.round((verifiedCount / totalExpected) * 100)) : 100;

  async function refreshSession() {
    try {
      const res = await secureFetch(`/api/audit/${data.id}`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch {
      /* silent */
    }
  }

  async function handleScan(code: string, quantity = 1) {
    if (!code.trim() || !isOngoing) return;
    setScanning(true);
    try {
      const res = await secureFetch(`/api/audit/${data.id}/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim(), quantity }),
      });
      const resJson = await res.json();
      if (!res.ok) {
        setLastFeedback({ message: resJson.error ?? "Error al escanear.", type: "error" });
        beepSound("error");
        return;
      }

      const feedbackType =
        resJson.result === "CORRECTO" ? "ok" : resJson.result === "FUERA_DE_ZONA" ? "warn" : "error";
      setLastFeedback({ message: resJson.message, type: feedbackType });
      beepSound(feedbackType);
      navigator.vibrate?.(feedbackType === "ok" ? 70 : [80, 50, 80]);

      setCodeScanInput("");
      setQtyInput(1);
      await refreshSession();
    } catch {
      setLastFeedback({ message: "Error de red al registrar escaneo.", type: "error" });
    } finally {
      setScanning(false);
    }
  }

  async function finalizeSession(action: "COMPLETADO" | "CANCELAR") {
    setFinalizing(true);
    try {
      const res = await secureFetch(`/api/audit/${data.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, autoAdjust: autoAdjustStock }),
      });
      if (res.ok) {
        setFinalizeOpen(false);
        router.refresh();
        await refreshSession();
      }
    } finally {
      setFinalizing(false);
    }
  }

  const filteredList = data.checklist.filter((item) => {
    if (tab === "CORRECTO") return item.status === "CORRECTO";
    if (tab === "FALTANTE") return item.status === "FALTANTE";
    if (tab === "DISCREPANCIAS")
      return item.status === "DISCREPANCIA_CANTIDAD" || item.status === "FUERA_DE_ZONA" || item.status === "DESCONOCIDO";
    return true;
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-5 sm:px-8 sm:py-12">
      <Link
        href="/recuento"
        className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-soft hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver a recuentos
      </Link>

      {/* ---------- Cabecera de la sesión ---------- */}
      <header className="mt-4 animate-fade-up">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: data.zoneColor }} />
            <div>
              <span className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-gold-deep">
                Recuento físico en zona
              </span>
              <h1 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                {data.zoneName}
              </h1>
            </div>
          </div>
          {isOngoing && (
            <div className="flex gap-2">
              <Button variant="dark" onClick={() => setFinalizeOpen(true)}>
                <ClipboardCheck className="h-4 w-4 text-gold-soft" />
                Finalizar recuento
              </Button>
            </div>
          )}
        </div>
        <p className="mt-2 text-xs text-ink-soft">
          Auditor: <strong>{data.auditorName ?? "Responsable"}</strong> · Iniciado {formatDateTime(data.startedAt)}
          {data.notes && ` · «${data.notes}»`}
        </p>
      </header>

      {/* ---------- Barra de progreso en vivo ---------- */}
      <section className="mt-6 rounded-3xl border border-line bg-cream p-5 shadow-card sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.2em] text-ink-soft">
              Progreso del recuento
            </p>
            <p className="mt-1 font-display text-3xl font-semibold text-ink">
              {verifiedCount} de {totalExpected}{" "}
              <span className="font-sans text-xs font-normal text-ink-soft">verificados</span>
            </p>
          </div>
          <span className="font-display text-2xl font-bold text-gold-deep">
            {progressPercent}%
          </span>
        </div>

        {/* Barra gráfica */}
        <div className="mt-3.5 h-3 w-full overflow-hidden rounded-full bg-paper-deep">
          <div
            className="h-full rounded-full bg-gradient-to-r from-gold to-emerald-500 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Resumen rápido de contadores */}
        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line-soft pt-4 text-center">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-2.5">
            <span className="block font-display text-xl font-bold text-emerald-700">
              {verifiedCount}
            </span>
            <span className="block text-[0.65rem] font-bold uppercase tracking-wider text-emerald-800">
              Verificados
            </span>
          </div>
          <div className="rounded-2xl border border-red-200 bg-red-50/70 p-2.5">
            <span className="block font-display text-xl font-bold text-red-700">
              {missingCount}
            </span>
            <span className="block text-[0.65rem] font-bold uppercase tracking-wider text-red-800">
              Faltantes
            </span>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-2.5">
            <span className="block font-display text-xl font-bold text-amber-700">
              {discrepanciesCount}
            </span>
            <span className="block text-[0.65rem] font-bold uppercase tracking-wider text-amber-800">
              Discrepancias
            </span>
          </div>
        </div>
      </section>

      {/* ---------- Módulo de Escaneo en Vivo ---------- */}
      {isOngoing && (
        <section className="mt-6 rounded-3xl border border-gold/40 bg-gold/10 p-5 shadow-card sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-gold-deep" />
              <h2 className="font-display text-lg font-semibold text-ink">
                Escanear código del artículo
              </h2>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCameraOpen(!cameraOpen)}
            >
              <Camera className="h-3.5 w-3.5" />
              {cameraOpen ? "Ocultar cámara" : "Abrir visor de cámara"}
            </Button>
          </div>

          {/* Visor de cámara integrado */}
          {cameraOpen && (
            <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-ink">
              <Scanner
                compact
                hideManual
                onCodeDetected={(code) => handleScan(code, qtyInput)}
              />
            </div>
          )}

          {/* Formulario de escaneo manual / teclado bluetooth */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleScan(codeScanInput, qtyInput);
            }}
            className="mt-4 flex flex-wrap items-end gap-2.5"
          >
            <div className="min-w-44 flex-1">
              <label className="block">
                <span className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-wider text-ink-soft">
                  Código (lector bluetooth o a mano)
                </span>
                <input
                  autoFocus
                  value={codeScanInput}
                  onChange={(e) => setCodeScanInput(e.target.value.toUpperCase())}
                  placeholder="Ej. PSB-000001 o código de barras"
                  className={`${inputCls} bg-white font-mono text-base font-bold tracking-wider`}
                />
              </label>
            </div>
            <div className="w-24">
              <label className="block">
                <span className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-wider text-ink-soft">
                  Cantidad
                </span>
                <input
                  type="number"
                  min={1}
                  value={qtyInput}
                  onChange={(e) => setQtyInput(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
                  className={`${inputCls} bg-white text-center font-bold`}
                />
              </label>
            </div>
            <Button type="submit" variant="dark" disabled={scanning || !codeScanInput.trim()}>
              {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
              Registrar
            </Button>
          </form>

          {/* Feedback interactivo tras el escaneo */}
          {lastFeedback && (
            <div
              className={`mt-4 flex items-start gap-2.5 rounded-2xl border p-3 text-xs leading-relaxed ${
                lastFeedback.type === "ok"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : lastFeedback.type === "warn"
                    ? "border-amber-200 bg-amber-50 text-amber-900"
                    : "border-red-200 bg-red-50 text-red-800"
              }`}
            >
              {lastFeedback.type === "ok" ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              )}
              <span>{lastFeedback.message}</span>
            </div>
          )}
        </section>
      )}

      {/* ---------- Lista de Verificación (Checklist) ---------- */}
      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold tracking-tight text-ink">
            Lista de artículos de la estancia
          </h2>
          <div className="flex flex-wrap gap-1 rounded-full border border-line bg-cream p-1 text-xs">
            <button
              onClick={() => setTab("TODOS")}
              className={`cursor-pointer rounded-full px-3 py-1 font-semibold ${
                tab === "TODOS" ? "bg-ink text-cream" : "text-ink-soft hover:text-ink"
              }`}
            >
              Todos ({data.checklist.length})
            </button>
            <button
              onClick={() => setTab("CORRECTO")}
              className={`cursor-pointer rounded-full px-3 py-1 font-semibold ${
                tab === "CORRECTO" ? "bg-emerald-700 text-white" : "text-emerald-800 hover:text-emerald-950"
              }`}
            >
              Verificados ({verifiedCount})
            </button>
            <button
              onClick={() => setTab("FALTANTE")}
              className={`cursor-pointer rounded-full px-3 py-1 font-semibold ${
                tab === "FALTANTE" ? "bg-red-700 text-white" : "text-red-800 hover:text-red-950"
              }`}
            >
              Faltantes ({missingCount})
            </button>
            {discrepanciesCount > 0 && (
              <button
                onClick={() => setTab("DISCREPANCIAS")}
                className={`cursor-pointer rounded-full px-3 py-1 font-semibold ${
                  tab === "DISCREPANCIAS" ? "bg-amber-700 text-white" : "text-amber-800 hover:text-amber-950"
                }`}
              >
                Discrepancias ({discrepanciesCount})
              </button>
            )}
          </div>
        </div>

        {filteredList.length === 0 ? (
          <div className="mt-4 rounded-3xl border border-dashed border-line bg-cream p-8 text-center text-sm text-ink-soft">
            No hay artículos en esta pestaña.
          </div>
        ) : (
          <ul className="mt-4 space-y-2.5">
            {filteredList.map((item) => {
              const isOk = item.status === "CORRECTO";
              const isMissing = item.status === "FALTANTE";
              const isWrongZone = item.status === "FUERA_DE_ZONA";

              return (
                <li
                  key={`${item.id}-${item.scannedCode}`}
                  className={`flex flex-wrap items-center gap-3.5 rounded-2xl border p-4 shadow-sm transition ${
                    isOk
                      ? "border-emerald-200 bg-emerald-50/40"
                      : isMissing
                        ? "border-line bg-white/70"
                        : isWrongZone
                          ? "border-purple-200 bg-purple-50/60"
                          : "border-amber-200 bg-amber-50/60"
                  }`}
                >
                  {/* Icono de estado */}
                  <span className="shrink-0">
                    {isOk ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    ) : isMissing ? (
                      <HelpCircle className="h-5 w-5 text-ink-faint" />
                    ) : isWrongZone ? (
                      <AlertCircle className="h-5 w-5 text-purple-600" />
                    ) : (
                      <TriangleAlert className="h-5 w-5 text-amber-600" />
                    )}
                  </span>

                  {/* Foto miniatura si existe */}
                  {item.photoId && (
                    <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-line">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`${photoUrl(item.photoId)}?thumb=1`}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </span>
                  )}

                  {/* Datos del artículo */}
                  <div className="min-w-44 flex-1">
                    <p className="text-sm font-semibold text-ink">{item.name}</p>
                    <p className="text-xs text-ink-soft">
                      <span className="font-mono text-[0.68rem]">{item.scannedCode}</span> · {item.category}
                      {item.notes && <span className="italic text-ink-faint"> · {item.notes}</span>}
                    </p>
                  </div>

                  {/* Comparativa de cantidades */}
                  <div className="text-right text-xs">
                    <span className="block font-bold">
                      {item.scannedQuantity} / {item.expectedQuantity} uds.
                    </span>
                    <span
                      className={`text-[0.65rem] font-semibold uppercase tracking-wider ${
                        isOk
                          ? "text-emerald-700"
                          : isMissing
                            ? "text-red-600"
                            : isWrongZone
                              ? "text-purple-700"
                              : "text-amber-700"
                      }`}
                    >
                      {item.status.replace(/_/g, " ")}
                    </span>
                  </div>

                  {/* Botón rápido para marcar / escanear en caliente */}
                  {isOngoing && isMissing && (
                    <button
                      onClick={() => void handleScan(item.scannedCode, item.expectedQuantity)}
                      className="cursor-pointer rounded-full border border-line bg-white px-3 py-1 text-xs font-semibold text-ink hover:bg-emerald-50 hover:text-emerald-700"
                    >
                      Verificar 1 ud.
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ---------- Modal Finalizar Recuento ---------- */}
      <Modal
        open={finalizeOpen}
        onClose={() => setFinalizeOpen(false)}
        title="Finalizar recuento físico"
        subtitle={`Zona: ${data.zoneName}`}
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-line bg-white p-4 text-sm leading-relaxed">
            <p className="font-bold text-ink">Resumen del balance:</p>
            <ul className="mt-2 space-y-1 text-xs text-ink-soft">
              <li>• Artículos verificados al 100%: <strong>{verifiedCount}</strong></li>
              <li>• Artículos no encontrados (faltantes): <strong>{missingCount}</strong></li>
              <li>• Discrepancias de cantidad / fuera de zona: <strong>{discrepanciesCount}</strong></li>
            </ul>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-gold/30 bg-gold/10 p-3.5">
            <input
              type="checkbox"
              checked={autoAdjustStock}
              onChange={(e) => setAutoAdjustStock(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded text-gold"
            />
            <span className="text-xs leading-relaxed text-ink">
              <strong>Ajustar existencias automáticamente en el inventario</strong> con los números reales contados durante este recuento.
            </span>
          </label>

          <div className="flex justify-end gap-2 border-t border-line-soft pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => void finalizeSession("CANCELAR")}
              disabled={finalizing}
            >
              Cancelar sesión
            </Button>
            <Button
              type="button"
              variant="dark"
              onClick={() => void finalizeSession("COMPLETADO")}
              disabled={finalizing}
            >
              {finalizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
              Guardar y cerrar informe
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
