"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Loader2,
  MapPinned,
  Play,
  Plus,
  Sparkles,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import type { AuditSession, Zone } from "@/db/schema";
import { Button, Field, Modal, ZoneIcon, inputCls } from "@/components/ui";
import { secureFetch } from "@/lib/secure-fetch";
import { formatDateTime } from "@/lib/utils";

type SessionWithZone = AuditSession & { zoneName: string; zoneColor: string };

export function AuditHub({
  sessions,
  zones,
}: {
  sessions: SessionWithZone[];
  zones: Zone[];
}) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [zoneId, setZoneId] = useState(zones[0]?.id ?? 0);
  const [auditorName, setAuditorName] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startSession(e: React.FormEvent) {
    e.preventDefault();
    if (!zoneId) return;
    setPending(true);
    setError(null);
    try {
      const res = await secureFetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zoneId, auditorName, notes }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo iniciar la sesión de recuento.");
        return;
      }
      setModalOpen(false);
      router.push(`/recuento/${data.id}`);
    } catch {
      setError("Error de conexión al iniciar el recuento.");
    } finally {
      setPending(false);
    }
  }

  const ongoing = sessions.filter((s) => s.status === "EN_CURSO");
  const completed = sessions.filter((s) => s.status !== "EN_CURSO");

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 lg:py-12">
      {/* ---------- Cabecera ---------- */}
      <header className="animate-fade-up">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-gold">
              Auditoría física anual
            </p>
            <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
              Modo Recuento
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">
              Recorre cada estancia de la parroquia escaneando con la cámara.
              El sistema comprueba uno a uno los artículos esperados y genera
              el informe de diferencias automáticamente.
            </p>
          </div>
          <Button
            variant="dark"
            onClick={() => {
              setZoneId(zones[0]?.id ?? 0);
              setError(null);
              setModalOpen(true);
            }}
          >
            <Play className="h-4 w-4 text-gold-soft" />
            Iniciar nuevo recuento
          </Button>
        </div>
      </header>

      {/* ---------- Sesiones en curso ---------- */}
      {ongoing.length > 0 && (
        <section className="mt-8 animate-fade-up" style={{ animationDelay: "100ms" }}>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-gold-deep" />
            </span>
            <h2 className="font-display text-xl font-semibold tracking-tight text-ink">
              Recuentos en curso ({ongoing.length})
            </h2>
          </div>
          <div className="mt-3.5 grid gap-3 sm:grid-cols-2">
            {ongoing.map((s) => (
              <Link
                key={s.id}
                href={`/recuento/${s.id}`}
                className="group relative overflow-hidden rounded-3xl border-2 border-gold/40 bg-gold/5 p-5 shadow-card transition hover:border-gold hover:shadow-lift"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[0.62rem] font-bold uppercase tracking-[0.2em] text-gold-deep">
                      En progreso
                    </span>
                    <h3 className="mt-1 font-display text-xl font-semibold text-ink">
                      {s.zoneName}
                    </h3>
                    <p className="mt-0.5 text-xs text-ink-soft">
                      Iniciado {formatDateTime(s.startedAt)} · {s.auditorName ?? "Responsable"}
                    </p>
                  </div>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-cream shadow transition group-hover:scale-105">
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-gold/20 pt-3 text-xs">
                  <span className="font-medium text-ink-soft">
                    {s.totalExpected} artículos previstos
                  </span>
                  <span className="font-bold text-gold-deep">
                    Continuar recuento →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ---------- Historial de recuentos pasados ---------- */}
      <section className="mt-10 animate-fade-up" style={{ animationDelay: "180ms" }}>
        <h2 className="font-display text-xl font-semibold tracking-tight text-ink">
          Historial de auditorías
        </h2>
        {completed.length === 0 ? (
          <div className="mt-4 rounded-3xl border border-dashed border-line bg-cream/70 p-10 text-center">
            <ClipboardCheck className="mx-auto h-8 w-8 text-gold" />
            <p className="mt-3 font-display text-base font-semibold text-ink">
              Sin auditorías finalizadas aún
            </p>
            <p className="mx-auto mt-1 max-w-sm text-xs text-ink-soft">
              Cuando completes un recuento físico en una zona, el informe
              con discrepancias y fecha quedará registrado aquí.
            </p>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-line-soft overflow-hidden rounded-3xl border border-line bg-cream shadow-card">
            {completed.map((s) => {
              const isCompleted = s.status === "COMPLETADO";
              return (
                <li key={s.id} className="p-4 transition hover:bg-paper/50 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: s.zoneColor }}
                      />
                      <div>
                        <p className="font-display text-base font-semibold text-ink">
                          {s.zoneName}
                        </p>
                        <p className="text-xs text-ink-soft">
                          {s.auditorName ?? "Responsable"} · {formatDateTime(s.startedAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${
                          isCompleted
                            ? s.totalDiscrepancies === 0
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-amber-200 bg-amber-50 text-amber-700"
                            : "border-stone-200 bg-stone-100 text-stone-500"
                        }`}
                      >
                        {isCompleted ? (
                          s.totalDiscrepancies === 0 ? (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              100% verificado
                            </>
                          ) : (
                            <>
                              <TriangleAlert className="h-3.5 w-3.5" />
                              {s.totalDiscrepancies} discrepancia(s)
                            </>
                          )
                        ) : (
                          <>
                            <XCircle className="h-3.5 w-3.5" />
                            Cancelado
                          </>
                        )}
                      </span>
                      <Link
                        href={`/recuento/${s.id}`}
                        className="rounded-full border border-line bg-white px-3.5 py-1 text-xs font-semibold text-ink transition hover:border-ink/30"
                      >
                        Ver informe
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ---------- Modal Iniciar Recuento ---------- */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Iniciar recuento en una zona"
        subtitle="Elige la ubicación que vas a recorrer con el móvil"
      >
        <form onSubmit={startSession} className="space-y-4">
          <Field label="Zona a auditar">
            <select
              value={zoneId}
              onChange={(e) => setZoneId(Number(e.target.value))}
              className={inputCls}
            >
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Nombre del responsable (auditor)">
            <input
              value={auditorName}
              onChange={(e) => setAuditorName(e.target.value)}
              placeholder="Ej. Juan Pérez (Sacristán)"
              className={inputCls}
            />
          </Field>

          <Field label="Notas iniciales (opcional)">
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Recuento anual de Pascua"
              className={inputCls}
            />
          </Field>

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-medium text-red-700">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 border-t border-line-soft pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setModalOpen(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="dark" disabled={pending || !zoneId}>
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Comenzar a escanear
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
