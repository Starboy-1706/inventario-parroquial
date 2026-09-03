"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Check,
  Copy,
  KeyRound,
  Loader2,
  MonitorSmartphone,
  Plus,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import type { AccessAttempt, AllowedIp } from "@/db/schema";
import { Button, Field, inputCls } from "@/components/ui";
import { formatDateTime, timeAgo } from "@/lib/utils";

export function AllowlistManager({
  rows,
  clientIp,
  attempts,
  schemaReady,
}: {
  rows: AllowedIp[];
  clientIp: string;
  attempts: AccessAttempt[];
  schemaReady: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ip, setIp] = useState("");
  const [label, setLabel] = useState("");
  const [pending, setPending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [rescueUrl, setRescueUrl] = useState("");

  const enforce = rows.length > 0;
  const isIpv6 = clientIp.includes(":");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setRescueUrl(`${window.location.origin}/seguridad/acceso?clave=parroquia2026`);
    }
    if (searchParams.get("rescate") === "ok") {
      flash("¡Dispositivo autenticado y autorizado con éxito!");
      router.replace("/seguridad", { scroll: false });
    }
  }, [searchParams, router]);

  function flash(msg: string) {
    setOk(msg);
    setTimeout(() => setOk(null), 4000);
  }

  async function add(custom?: { ip?: string; label?: string }) {
    setPending(true);
    setError(null);
    try {
      const payload: Record<string, string> = {};
      if (custom?.ip !== undefined) payload.ip = custom.ip;
      else if (ip.trim()) payload.ip = ip.trim();
      const lbl = custom?.label ?? label.trim();
      if (lbl) payload.label = lbl;

      const res = await fetch("/api/allowlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No se pudo autorizar la IP.");
        return;
      }
      setIp("");
      setLabel("");
      flash(`IP ${data.ip} autorizada con éxito`);
      router.refresh();
    } catch {
      setError("Error de conexión al autorizar la IP.");
    } finally {
      setPending(false);
    }
  }

  async function remove(id: number) {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/allowlist/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No se pudo eliminar.");
        return;
      }
      flash("IP retirada de la lista blanca");
      router.refresh();
    } catch {
      setError("Error de conexión.");
    } finally {
      setPending(false);
    }
  }

  function handleRefresh() {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 600);
  }

  function copyRescueLink() {
    if (!rescueUrl) return;
    navigator.clipboard.writeText(rescueUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function submitManual(e: FormEvent) {
    e.preventDefault();
    void add();
  }

  const isCurrentAuthorized = rows.some(
    (r) => r.ip === clientIp || (r.ip.includes("/") && r.ip.split("/")[0] === clientIp),
  );

  return (
    <div className="space-y-6">
      {/* Aviso de tablas pendientes */}
      {!schemaReady && (
        <div className="rounded-2xl border border-red-200 bg-red-50/80 px-4 py-4 text-sm leading-relaxed">
          <p className="flex items-center gap-2 font-bold text-red-800">
            <TriangleAlert className="h-4.5 w-4.5 shrink-0" />
            Las tablas de seguridad no existen todavía en la base de datos
          </p>
          <p className="mt-2 text-ink-soft">
            La aplicación funciona en modo abierto de momento. Para activar el bloqueo por IP, ejecuta en Codespaces:
          </p>
          <pre className="mt-2.5 overflow-x-auto rounded-xl bg-ink px-4 py-3 font-mono text-[0.72rem] leading-relaxed text-cream">
{`export DATABASE_URL="postgresql://postgres.TU-REF:TU-CLAVE@aws-0-….pooler.supabase.com:5432/postgres"
npx drizzle-kit push`}
          </pre>
        </div>
      )}

      {/* Estado del filtro */}
      <div
        className={
          enforce
            ? "flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3.5"
            : "flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3.5"
        }
      >
        {enforce ? (
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
        ) : (
          <ShieldQuestion className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        )}
        <div className="text-sm leading-relaxed">
          {enforce ? (
            <>
              <strong className="text-emerald-800">Bloqueo activo por IP.</strong>{" "}
              <span className="text-ink-soft">
                Solo los dispositivos autorizados ven la app; el resto recibe una página en blanco.
              </span>
            </>
          ) : (
            <>
              <strong className="text-amber-800">Modo abierto (sin IPs autorizadas).</strong>{" "}
              <span className="text-ink-soft">
                Autoriza este dispositivo para activar la protección de inmediato.
              </span>
            </>
          )}
        </div>
      </div>

      {/* Tu dispositivo actual */}
      <div className="rounded-3xl border border-line bg-cream p-5 shadow-card sm:p-6">
        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-ink-soft">
          Este dispositivo
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-2.5 rounded-2xl border border-line bg-white px-4 py-2.5">
            <MonitorSmartphone className="h-4.5 w-4.5 text-gold" />
            <span className="font-mono text-sm font-bold tracking-wider text-ink sm:text-base">
              {clientIp}
            </span>
            {isIpv6 && (
              <span className="rounded bg-sky-100 px-1.5 py-0.5 font-sans text-[0.6rem] font-bold text-sky-800">
                IPv6
              </span>
            )}
          </span>
          {isCurrentAuthorized ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              Dispositivo autorizado
            </span>
          ) : (
            <Button
              variant="dark"
              onClick={() =>
                void add({
                  ip: isIpv6 ? `${clientIp}/64` : clientIp,
                  label: "Este dispositivo",
                })
              }
              disabled={pending}
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
              {isIpv6 ? "Autorizar este dispositivo (/64)" : "Autorizar este dispositivo"}
            </Button>
          )}
        </div>
      </div>

      {/* ENLACE DE RESCATE / ACCESO DIRECTO */}
      <div className="rounded-3xl border border-gold/40 bg-gold/10 p-5 shadow-card sm:p-6">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4.5 w-4.5 text-gold-deep" />
          <h2 className="font-display text-lg font-semibold tracking-tight text-ink">
            Enlace de rescate directo (sin configurar IPs)
          </h2>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-ink-soft">
          Abre este enlace desde cualquier teléfono o tablet nuevo: su IP se autorizará automáticamente y quedará autenticado al instante.
        </p>
        <div className="mt-3.5 flex flex-wrap items-center gap-2">
          <input
            readOnly
            value={rescueUrl || "Cargando enlace..."}
            className={`${inputCls} max-w-xl font-mono text-xs text-ink-soft select-all bg-white`}
          />
          <Button variant="outline" size="sm" onClick={copyRescueLink} disabled={!rescueUrl}>
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "¡Copiado!" : "Copiar enlace"}
          </Button>
        </div>
      </div>

      {/* INTENTOS DE ACCESO EN VIVO */}
      {enforce && (
        <div className="rounded-3xl border border-amber-200/70 bg-amber-50/60 p-5 shadow-card sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4.5 w-4.5 text-amber-600" />
              <h2 className="font-display text-lg font-semibold tracking-tight text-ink">
                Intentos de acceso recientes
              </h2>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-amber-200 bg-white px-3 py-1 text-[0.68rem] font-semibold text-amber-900 transition hover:bg-amber-100 disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
              Actualizar
            </button>
          </div>
          {attempts.length === 0 ? (
            <p className="mt-2.5 text-xs text-ink-soft">
              No hay intentos bloqueados recientemente. Al intentar entrar desde un móvil nuevo, aparecerá aquí.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-amber-200/60">
              {attempts.map((a) => {
                const already = rows.some((r) => r.ip === a.ip || r.ip.split("/")[0] === a.ip);
                return (
                  <li key={`${a.id}-${a.ip}`} className="flex flex-wrap items-center gap-2.5 py-2.5">
                    <span className="font-mono text-xs font-bold text-ink sm:text-sm">
                      {a.ip}
                    </span>
                    <span className="text-[0.68rem] text-ink-faint">
                      {timeAgo(a.createdAt)}
                    </span>
                    <span className="flex-1" />
                    {already ? (
                      <span className="text-[0.65rem] font-bold uppercase tracking-wider text-emerald-700">
                        ya autorizada
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="primary"
                        disabled={pending}
                        onClick={() =>
                          void add({
                            ip: a.ip.includes(":") ? `${a.ip}/64` : a.ip,
                            label: "Autorizado desde intentos",
                          })
                        }
                      >
                        {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3" />}
                        Autorizar
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* Lista blanca configurada */}
      <div className="rounded-3xl border border-line bg-cream p-5 shadow-card sm:p-6">
        <h2 className="font-display text-xl font-semibold tracking-tight text-ink">
          IPs y rangos autorizados
        </h2>

        {rows.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-line bg-white/60 px-4 py-6 text-sm text-ink-soft">
            La lista está vacía. Autoriza tu IP arriba o mediante el enlace de rescate.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-line-soft">
            {rows.map((r) => {
              const isMe = r.ip === clientIp || r.ip === `${clientIp}/64`;
              return (
                <li key={r.id} className="flex flex-wrap items-center gap-3 py-3">
                  <ShieldCheck className="h-4.5 w-4.5 shrink-0 text-emerald-600" />
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs font-bold tracking-wider text-ink sm:text-sm">
                      {r.ip}
                      {isMe && (
                        <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 font-sans text-[0.62rem] font-bold uppercase tracking-wide text-emerald-700">
                          este dispositivo
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-ink-soft">
                      {r.label ?? "Sin etiqueta"} · {formatDateTime(r.createdAt)}
                    </p>
                  </div>
                  <button
                    onClick={() => void remove(r.id)}
                    disabled={pending || isMe}
                    aria-label={`Eliminar ${r.ip}`}
                    title={isMe ? "No puedes eliminar tu propia IP" : "Eliminar"}
                    className="cursor-pointer rounded-full p-2 text-ink-faint transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {/* Añadir otra IP manualmente */}
        <form
          onSubmit={submitManual}
          className="mt-5 flex flex-wrap items-end gap-3 border-t border-line-soft pt-4"
        >
          <div className="min-w-44">
            <Field label="IP exacta o rango CIDR">
              <input
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                placeholder="83.45.12.9 o 83.45.12.0/24"
                className={`${inputCls} font-mono text-xs`}
              />
            </Field>
          </div>
          <div className="min-w-44 flex-1">
            <Field label="Etiqueta / Descripción">
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Ej. WiFi Casa Rectoral, Móvil Párroco…"
                className={inputCls}
              />
            </Field>
          </div>
          <Button type="submit" variant="primary" disabled={pending || !ip.trim()}>
            <Plus className="h-4 w-4" />
            Añadir a lista
          </Button>
        </form>

        {error && (
          <p className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </p>
        )}
        {ok && (
          <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700">
            {ok}
          </p>
        )}
      </div>
    </div>
  );
}
