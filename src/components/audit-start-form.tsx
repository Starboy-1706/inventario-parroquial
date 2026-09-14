"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ClipboardCheck,
  Loader2,
  Play,
  TriangleAlert,
} from "lucide-react";
import type { Zone } from "@/db/schema";
import { Button, Field, inputCls, ZoneIcon } from "@/components/ui";
import { secureFetch } from "@/lib/secure-fetch";
import { cn } from "@/lib/utils";

/** Inicio de recuento como página completa (sin ventanas flotantes). */
export function AuditStartForm({ zones }: { zones: Zone[] }) {
  const router = useRouter();
  const [zoneId, setZoneId] = useState(zones[0]?.id ?? 0);
  const [auditorName, setAuditorName] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startSession(e: FormEvent) {
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
      router.push(`/recuento/${data.id}`);
    } catch {
      setError("Error de conexión al iniciar el recuento.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-5 sm:px-8 lg:py-12">
      <Link
        href="/recuento"
        className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft transition hover:text-ink active:scale-95"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver a recuentos
      </Link>

      <header className="mt-4 animate-fade-up">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-gold">
          Auditoría física
        </p>
        <h1 className="mt-1.5 font-display text-2xl font-semibold tracking-tight text-ink sm:text-4xl lg:text-5xl">
          Iniciar recuento en una zona
        </h1>
        <p className="mt-1.5 max-w-xl text-xs leading-relaxed text-ink-soft sm:text-sm">
          Elige la ubicación que vas a recorrer con el móvil. Se generará la
          lista de artículos esperados para verificarlos uno a uno con el escáner.
        </p>
      </header>

      {zones.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-amber-200 bg-amber-50/80 p-6 text-sm leading-relaxed text-amber-900">
          <p className="font-bold text-amber-950">Primero crea una zona</p>
          <p className="mt-1">El recuento se realiza sobre una ubicación física concreta.</p>
          <Link
            href="/zonas/nueva"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-xs font-semibold text-cream transition hover:bg-ink/85"
          >
            Crear la primera zona →
          </Link>
        </div>
      ) : (
        <form
          onSubmit={startSession}
          className="mt-8 animate-fade-up space-y-5"
          style={{ animationDelay: "120ms" }}
        >
          {error && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
            >
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </p>
          )}

          <section className="rounded-3xl border border-line bg-cream p-5 shadow-card sm:p-6">
            <h2 className="flex items-center gap-2 text-[0.66rem] font-bold uppercase tracking-[0.2em] text-gold-deep">
              <ClipboardCheck className="h-3.5 w-3.5" />
              Datos del recuento
            </h2>
            <div className="mt-4 grid gap-4">
              <Field label="Zona a auditar">
                <div className="grid gap-2 sm:grid-cols-2">
                  {zones.map((z) => {
                    const active = zoneId === z.id;
                    return (
                      <label
                        key={z.id}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-2xl border-2 p-3 transition",
                          active
                            ? "border-gold bg-gold/10"
                            : "border-line bg-white/60 hover:border-ink/25",
                        )}
                      >
                        <input
                          type="radio"
                          name="zoneId"
                          value={z.id}
                          checked={active}
                          onChange={() => setZoneId(z.id)}
                          className="sr-only"
                        />
                        <ZoneIcon icon={z.icon} color={z.color} size="sm" />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-bold text-ink">
                            {z.name}
                          </span>
                          {z.description && (
                            <span className="block truncate text-[0.68rem] text-ink-soft">
                              {z.description}
                            </span>
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </Field>

              <Field label="Nombre del responsable (auditor)">
                <input
                  value={auditorName}
                  onChange={(e) => setAuditorName(e.target.value)}
                  placeholder="Ej. Juan Pérez (Sacristán)"
                  maxLength={120}
                  className={inputCls}
                />
              </Field>

              <Field label="Notas iniciales (opcional)">
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej. Recuento anual de Pascua"
                  maxLength={300}
                  className={inputCls}
                />
              </Field>
            </div>
          </section>

          <div className="flex items-center justify-between gap-3 border-t border-line-soft pt-4">
            <Link
              href="/recuento"
              className="inline-flex items-center justify-center rounded-full border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink-soft transition hover:bg-ink/5 hover:text-ink sm:border-0 sm:bg-transparent"
            >
              Cancelar
            </Link>
            <Button type="submit" variant="dark" disabled={pending || !zoneId} className="shadow-lift">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 text-gold-soft" />}
              Comenzar a escanear
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
