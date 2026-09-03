"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  MonitorSmartphone,
  Plus,
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
}: {
  rows: AllowedIp[];
  clientIp: string;
  attempts: AccessAttempt[];
}) {
  const router = useRouter();
  const [ip, setIp] = useState("");
  const [label, setLabel] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const enforce = rows.length > 0;

  function flash(msg: string) {
    setOk(msg);
    setTimeout(() => setOk(null), 3500);
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
      flash(`IP ${data.ip} autorizada`);
      router.refresh();
    } catch {
      setError("Error de conexión.");
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

  function submitManual(e: FormEvent) {
    e.preventDefault();
    void add();
  }

  return (
    <div className="space-y-6">
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
              <strong className="text-emerald-800">Bloqueo activo.</strong>{" "}
              <span className="text-ink-soft">
                Solo los dispositivos con estas IPs ven la aplicación; el resto
                recibe una página en blanco.
              </span>
            </>
          ) : (
            <>
              <strong className="text-amber-800">Modo abierto (aún no hay IPs autorizadas).</strong>{" "}
              <span className="text-ink-soft">
                En cuanto autorices la primera, cualquier otro dispositivo
                dejará de ver la aplicación.
              </span>
            </>
          )}
        </div>
      </div>

      {/* Tu dispositivo */}
      <div className="rounded-3xl border border-line bg-cream p-5 shadow-card sm:p-6">
        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-ink-soft">
          Este dispositivo
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-2.5 rounded-2xl border border-line bg-white px-4 py-3">
            <MonitorSmartphone className="h-4.5 w-4.5 text-gold" />
            <span className="font-mono text-base font-bold tracking-wider text-ink">
              {clientIp}
            </span>
          </span>
          {rows.some((r) => r.ip === clientIp) ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              Ya autorizado
            </span>
          ) : (
            <Button
              variant="dark"
              onClick={() =>
                void add({ label: label.trim() || "Este dispositivo" })
              }
              disabled={pending}
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
              Autorizar este dispositivo
            </Button>
          )}
        </div>
      </div>

      {/* Intentos de acceso: autorizar dispositivos nuevos con un clic */}
      {enforce && attempts.length > 0 && (
        <div className="rounded-3xl border border-amber-200/70 bg-amber-50/50 p-5 shadow-card sm:p-6">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4.5 w-4.5 text-amber-600" />
            <h2 className="font-display text-xl font-semibold tracking-tight text-ink">
              Intentos de acceso detectados
            </h2>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">
            Dispositivos que intentaron entrar y fueron rechazados. Si uno es
            tuyo o de un compañero, autorízalo con un clic — sin teclear nada.
          </p>
          <ul className="mt-3.5 divide-y divide-amber-200/60">
            {attempts.map((a) => {
              const already = rows.some(
                (r) => r.ip === a.ip || r.ip.split("/")[0] === a.ip,
              );
              return (
                <li key={`${a.id}-${a.ip}`} className="flex items-center gap-3 py-2.5">
                  <span className="font-mono text-sm font-bold tracking-wider text-ink">
                    {a.ip}
                  </span>
                  <button
                    onClick={() =>
                      alert(new Date(a.createdAt).toLocaleString("es-ES"))
                    }
                    className="cursor-help text-xs text-ink-soft underline-offset-2 hover:underline"
                  >
                    {timeAgo(a.createdAt)}
                  </button>
                  <span className="flex-1" />
                  {already ? (
                    <span className="text-[0.68rem] font-bold uppercase tracking-wide text-emerald-700">
                      autorizada
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant="primary"
                      disabled={pending}
                      onClick={() =>
                        void add({ ip: a.ip, label: "Dispositivo autorizado desde intentos" })
                      }
                    >
                      {pending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <ShieldCheck className="h-3.5 w-3.5" />
                      )}
                      Autorizar
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Lista blanca */}
      <div className="rounded-3xl border border-line bg-cream p-5 shadow-card sm:p-6">
        <h2 className="font-display text-xl font-semibold tracking-tight text-ink">
          IPs autorizadas
        </h2>

        {rows.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-line bg-white/60 px-4 py-6 text-sm text-ink-soft">
            La lista está vacía. Autoriza tu IP arriba para activar el bloqueo.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-line-soft">
            {rows.map((r) => {
              const isMe = r.ip === clientIp;
              return (
                <li key={r.id} className="flex items-center gap-3 py-3">
                  <ShieldCheck className="h-4.5 w-4.5 shrink-0 text-emerald-600" />
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm font-bold tracking-wider text-ink">
                      {r.ip}
                      {isMe && (
                        <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 font-sans text-[0.62rem] font-bold uppercase tracking-wide text-emerald-700">
                          este dispositivo
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-ink-soft">
                      {r.label ?? "Sin etiqueta"} · autorizada el {formatDateTime(r.createdAt)}
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
            <Field label="Otra IP o rango">
              <input
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                placeholder="83.45.12.9 o 83.45.12.0/24"
                className={`${inputCls} font-mono text-[0.85rem]`}
              />
            </Field>
          </div>
          <div className="min-w-44 flex-1">
            <Field label="Etiqueta">
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Ej. Casa del párroco, ordenador del despacho…"
                className={inputCls}
              />
            </Field>
          </div>
          <Button type="submit" variant="primary" disabled={pending || !ip.trim()}>
            <Plus className="h-4 w-4" />
            Autorizar
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
