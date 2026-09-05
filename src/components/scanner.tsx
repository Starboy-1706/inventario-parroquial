"use client";

import { secureFetch } from "@/lib/secure-fetch";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Camera,
  CameraOff,
  ChevronRight,
  Keyboard,
  Loader2,
  Minus,
  PackagePlus,
  Plus,
  RotateCcw,
  ScanLine,
  SwitchCamera,
  TriangleAlert,
} from "lucide-react";
import type { Html5Qrcode as Html5QrcodeType } from "html5-qrcode";
import type { Item, Zone } from "@/db/schema";
import { extractCode, photoUrl } from "@/lib/utils";
import { Button, StatusBadge, TypeBadge, inputCls } from "@/components/ui";
import { cn } from "@/lib/utils";

type ScannedItem = Item & { zone: Zone };

type Phase =
  | "idle"
  | "starting"
  | "scanning"
  | "looking"
  | "result"
  | "notfound";

const READER_ID = "parish-qr-reader";

function beep(ok: boolean) {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = ok ? 880 : 220;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
    osc.onended = () => void ctx.close();
  } catch {
    /* sin audio */
  }
}

export function Scanner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [phase, setPhase] = useState<Phase>("idle");
  const [camError, setCamError] = useState<string | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [item, setItem] = useState<ScannedItem | null>(null);
  const [manual, setManual] = useState("");
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [cameraIdx, setCameraIdx] = useState(0);
  const [adjusting, setAdjusting] = useState(false);

  const scannerRef = useRef<Html5QrcodeType | null>(null);
  const busyRef = useRef(false);
  const phaseRef = useRef<Phase>("idle");
  phaseRef.current = phase;

  /* ---------------- Ciclo de vida de la cámara ---------------- */

  const stopScanner = useCallback(async () => {
    const s = scannerRef.current;
    if (s && s.isScanning) {
      try {
        await s.stop();
      } catch {
        /* ya detenido */
      }
    }
    scannerRef.current = null;
  }, []);

  const startScanner = useCallback(
    async (preferredId?: string) => {
      setCamError(null);
      setPhase("starting");
      await stopScanner();
      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import(
          "html5-qrcode"
        );
        const scanner = new Html5Qrcode(READER_ID, {
          verbose: false,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.CODE_93,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.ITF,
            Html5QrcodeSupportedFormats.CODABAR,
            Html5QrcodeSupportedFormats.DATA_MATRIX,
          ],
        });
        scannerRef.current = scanner;

        const onSuccess = (decodedText: string) => {
          if (busyRef.current || phaseRef.current !== "scanning") return;
          busyRef.current = true;
          void lookup(decodedText);
        };

        if (preferredId) {
          await scanner.start(
            preferredId,
            { fps: 10, qrbox: (w, h) => ({ width: Math.min(w, h) * 0.72, height: Math.min(w, h) * 0.72 }) },
            onSuccess,
            () => {},
          );
        } else {
          await scanner.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: (w, h) => ({ width: Math.min(w, h) * 0.72, height: Math.min(w, h) * 0.72 }) },
            onSuccess,
            () => {},
          );
        }
        setPhase("scanning");
        if (cameras.length === 0) {
          const cams = await Html5Qrcode.getCameras().catch(() => []);
          setCameras(cams.map((c) => ({ id: c.id, label: c.label })));
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setCamError(
          msg.includes("NotAllowed") || msg.includes("Permission")
            ? "Permiso de cámara denegado. Actívalo en los ajustes del navegador y recarga."
            : window.isSecureContext
              ? "No se pudo acceder a la cámara. Comprueba que no esté en uso por otra app."
              : "La cámara requiere una conexión segura (HTTPS) o localhost.",
        );
        setPhase("idle");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stopScanner, cameras.length],
  );

  useEffect(() => {
    return () => {
      void stopScanner();
    };
  }, [stopScanner]);

  async function switchCamera() {
    if (cameras.length < 2) return;
    const next = (cameraIdx + 1) % cameras.length;
    setCameraIdx(next);
    await startScanner(cameras[next].id);
  }

  /* ---------------- Consulta de códigos ---------------- */

  async function lookup(raw: string) {
    const code = extractCode(raw);
    setPhase("looking");
    setLookupError(null);
    try {
      const res = await secureFetch(`/api/scan/${encodeURIComponent(code)}`);
      const data = await res.json();
      if (!res.ok) {
        setItem(null);
        setLookupError(data.error ?? `Código ${code} no encontrado.`);
        setPhase("notfound");
        beep(false);
        navigator.vibrate?.([60, 40, 60]);
        return;
      }
      setItem(data);
      setPhase("result");
      beep(true);
      navigator.vibrate?.(80);
    } catch {
      setLookupError("Error de conexión. Comprueba tu red e inténtalo de nuevo.");
      setPhase("notfound");
    } finally {
      void stopScanner();
      busyRef.current = false;
    }
  }

  // Enlace directo desde una etiqueta QR externa: /escaner?code=SAC-0001
  useEffect(() => {
    const code = searchParams.get("code");
    if (code) {
      void lookup(code);
      router.replace("/escaner", { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function scanAnother() {
    setItem(null);
    setLookupError(null);
    setManual("");
    setCameraIdx(0);
    void startScanner();
  }

  async function quickAdjust(delta: number) {
    if (!item) return;
    setAdjusting(true);
    try {
      const res = await secureFetch(`/api/items/${item.id}/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delta, note: "Ajuste rápido desde escáner" }),
      });
      const data = await res.json();
      if (res.ok) {
        setItem({ ...item, quantity: data.quantity });
      }
    } finally {
      setAdjusting(false);
    }
  }

  /* ---------------- Render ---------------- */

  return (
    <div className="space-y-6">
      {/* ---------- Visor de cámara ---------- */}
      <div className="relative overflow-hidden rounded-3xl border border-ink/80 bg-ink shadow-lift">
        <div className="relative mx-auto aspect-[4/3] max-h-[62dvh] w-full sm:aspect-[16/10]">
          {/* El elemento que usa html5-qrcode debe existir siempre */}
          <div id={READER_ID} className="absolute inset-0 h-full w-full [&_video]:h-full [&_video]:w-full [&_video]:object-cover" />

          {phase === "idle" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full border border-gold/40 bg-gold/10">
                {camError ? (
                  <CameraOff className="h-7 w-7 text-gold-soft" strokeWidth={1.6} />
                ) : (
                  <Camera className="h-7 w-7 text-gold-soft" strokeWidth={1.6} />
                )}
              </span>
              <div>
                <p className="font-display text-xl font-semibold text-cream">
                  {camError ? "La cámara no está disponible" : "Listo para escanear"}
                </p>
                <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-cream/55">
                  {camError ??
                    "Apunta a cualquier etiqueta QR o código de barras del inventario. La lectura se hace en tiempo real, con QR y barras clásicos."}
                </p>
              </div>
              {!camError && (
                <button
                  onClick={() => void startScanner()}
                  className="inline-flex cursor-pointer items-center gap-2.5 rounded-full bg-gold px-6 py-3 text-sm font-bold text-ink shadow-lift transition hover:bg-gold-soft active:scale-95"
                >
                  <ScanLine className="h-4 w-4" strokeWidth={2.2} />
                  Iniciar cámara
                </button>
              )}
              {camError && (
                <button
                  onClick={() => void startScanner()}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-cream/25 px-5 py-2.5 text-xs font-semibold text-cream transition hover:bg-white/10"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reintentar
                </button>
              )}
            </div>
          )}

          {phase === "starting" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-gold-soft" />
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-cream/60">
                Encendiendo cámara…
              </p>
            </div>
          )}

          {phase === "scanning" && (
            <>
              {/* Marco de encuadre */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="relative aspect-square w-[62%] max-w-72">
                  {["top-0 left-0 border-t-3 border-l-3", "top-0 right-0 border-t-3 border-r-3", "bottom-0 left-0 border-b-3 border-l-3", "bottom-0 right-0 border-b-3 border-r-3"].map(
                    (pos) => (
                      <span
                        key={pos}
                        className={cn("absolute h-8 w-8 rounded-[3px] border-gold-soft", pos)}
                      />
                    ),
                  )}
                  <span className="scan-sweep absolute inset-x-3 h-0.5 rounded-full bg-gold-soft shadow-[0_0_18px_4px_rgba(201,162,75,0.65)]" />
                </div>
              </div>
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-ink/90 to-transparent px-5 pb-4 pt-10">
                <p className="flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-cream/70">
                  <span className="pulse-soft h-1.5 w-1.5 rounded-full bg-gold-soft" />
                  Escaneando… acerca el código
                </p>
                <div className="flex gap-2">
                  {cameras.length > 1 && (
                    <button
                      onClick={() => void switchCamera()}
                      className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-cream/25 text-cream transition hover:bg-white/10"
                      aria-label="Cambiar de cámara"
                    >
                      <SwitchCamera className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      void stopScanner();
                      setPhase("idle");
                    }}
                    className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-cream/25 text-cream transition hover:bg-white/10"
                    aria-label="Detener cámara"
                  >
                    <CameraOff className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          )}

          {phase === "looking" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink/80">
              <Loader2 className="h-8 w-8 animate-spin text-gold-soft" />
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-cream/70">
                Consultando ficha…
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ---------- Entrada manual ---------- */}
      {(phase === "idle" || phase === "scanning") && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (manual.trim()) void lookup(manual);
          }}
          className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-line bg-cream p-3.5 shadow-card"
        >
          <Keyboard className="ml-1 h-4 w-4 shrink-0 text-ink-faint" />
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value.toUpperCase())}
            placeholder="O escribe el código a mano, ej. SAC-0001"
            className={cn(inputCls, "min-w-40 flex-1 border-0 bg-transparent py-1.5 font-mono tracking-widest shadow-none focus:ring-0")}
          />
          <Button type="submit" variant="dark" size="sm" disabled={!manual.trim()}>
            Consultar
          </Button>
        </form>
      )}

      {/* ---------- Resultado: encontrado ---------- */}
      {phase === "result" && item && (
        <div className="animate-fade-up overflow-hidden rounded-3xl border border-line bg-cream shadow-lift">
          <div
            className="h-1.5 w-full"
            style={{ backgroundColor: item.zone.color }}
          />
          {item.photoId && (
            <div className="relative h-44 w-full overflow-hidden sm:h-56">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoUrl(item.photoId) ?? ""}
                alt={`Fotografía de ${item.name}`}
                className="h-full w-full object-cover"
              />
              <span className="absolute inset-0 bg-gradient-to-t from-cream via-transparent to-transparent" />
            </div>
          )}
          <div className="p-5 sm:p-7">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg border border-line bg-white px-2.5 py-1 font-mono text-xs font-bold tracking-[0.18em] text-ink">
                {item.code}
              </span>
              <TypeBadge type={item.itemType} />
              <StatusBadge status={item.status} />
            </div>
            <h2 className="mt-3 font-display text-2xl font-semibold leading-tight tracking-tight text-ink sm:text-3xl">
              {item.name}
            </h2>
            <p className="mt-1.5 text-sm text-ink-soft">
              <span
                className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle"
                style={{ backgroundColor: item.zone.color }}
              />
              {item.zone.name}
              {item.description && (
                <>
                  <span className="mx-2 text-ink-faint">·</span>
                  <span className="line-clamp-1 align-middle">{item.description}</span>
                </>
              )}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              {item.itemType === "CONTABLE" && (
                <div className="flex items-center gap-1.5 rounded-full border border-line bg-white px-2 py-1.5">
                  <button
                    onClick={() => void quickAdjust(-1)}
                    disabled={adjusting || item.quantity === 0}
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-ink transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                    aria-label="Retirar una unidad"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="min-w-12 text-center font-display text-xl font-semibold text-ink">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => void quickAdjust(1)}
                    disabled={adjusting}
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-ink transition hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-40"
                    aria-label="Añadir una unidad"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              )}
              <Link
                href={`/inventario/${item.id}`}
                className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-cream transition hover:bg-basilica-deep"
              >
                Ver ficha completa
                <ChevronRight className="h-4 w-4 text-gold-soft" />
              </Link>
              <Button variant="outline" onClick={scanAnother}>
                <ScanLine className="h-4 w-4" />
                Escanear otro
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Resultado: no encontrado ---------- */}
      {phase === "notfound" && (
        <div className="animate-fade-up rounded-3xl border border-amber-200 bg-amber-50/80 p-5 shadow-card sm:p-7">
          <div className="flex items-start gap-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <TriangleAlert className="h-5 w-5" strokeWidth={1.8} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-xl font-semibold tracking-tight text-ink">
                Código no registrado
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                {lookupError}
              </p>
              <div className="mt-4 flex flex-wrap gap-2.5">
                <Button variant="dark" onClick={scanAnother}>
                  <ScanLine className="h-4 w-4" />
                  Escanear de nuevo
                </Button>
                <Link
                  href="/inventario"
                  className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink transition hover:border-ink/25"
                >
                  <PackagePlus className="h-4 w-4" />
                  Dar de alta un artículo
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
