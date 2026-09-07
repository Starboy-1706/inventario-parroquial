"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock3, Download, KeyRound, Loader2, LogOut, RotateCcw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui";

export function SecurityPanel({
  expiresAt,
}: {
  expiresAt: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/acceso");
      router.refresh();
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-emerald-200 bg-emerald-50/70 p-5 shadow-card sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-display text-xl font-semibold text-ink">
              Acceso protegido por clave
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">
              La sesión está validada en el servidor. Sin una cookie firmada válida,
              la aplicación redirige a la ventana de acceso y todas las APIs rechazan la petición.
            </p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-white/70 px-3.5 py-2.5 text-xs text-ink-soft">
          <Clock3 className="h-3.5 w-3.5 text-emerald-700" />
          Esta sesión caduca el <strong className="text-ink">{expiresAt}</strong>
        </div>
      </section>

      <section className="rounded-3xl border border-line bg-cream p-5 shadow-card sm:p-6">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4.5 w-4.5 text-gold-deep" />
          <h2 className="font-display text-xl font-semibold text-ink">Cambiar la clave</h2>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Cambia <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs text-ink">ACCESS_PASSWORD</code>
          {" "}en Vercel → Settings → Environment Variables y redespliega. Al cambiarla,
          todas las sesiones anteriores quedan invalidadas automáticamente.
        </p>
        <div className="mt-4 rounded-2xl border border-line-soft bg-white/60 p-4">
          <p className="flex items-center gap-2 text-xs font-bold text-ink">
            <RotateCcw className="h-3.5 w-3.5 text-gold" />
            Revocar todos los dispositivos de inmediato
          </p>
          <p className="mt-1 text-xs leading-relaxed text-ink-soft">
            Cambia <code className="font-mono text-[0.68rem]">SESSION_SECRET</code> en Vercel por otro valor aleatorio de 32 caracteres o más y redespliega.
          </p>
        </div>
      </section>

      <section className="rounded-3xl border border-line bg-cream p-5 shadow-card sm:p-6">
        <div className="flex items-center gap-2">
          <Download className="h-4.5 w-4.5 text-gold-deep" />
          <h2 className="font-display text-xl font-semibold text-ink">
            Copia de seguridad completa
          </h2>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Descarga un archivo JSON estructurado con todos los artículos, estancias,
          categorías, movimientos históricos, préstamos y fichas de mantenimiento.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href="/api/backup"
            download
            className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-xs font-bold text-cream shadow transition hover:bg-basilica-deep"
          >
            <Download className="h-3.5 w-3.5 text-gold-soft" />
            Descargar respaldo completo (JSON)
          </a>
          <a
            href="/api/export"
            download
            className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2.5 text-xs font-bold text-ink shadow transition hover:border-ink/30"
          >
            <Download className="h-3.5 w-3.5 text-gold-deep" />
            Descargar tabla para Excel (CSV)
          </a>
        </div>
      </section>

      <section className="rounded-3xl border border-line bg-cream p-5 shadow-card sm:p-6">
        <h2 className="font-display text-xl font-semibold text-ink">Finalizar esta sesión</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Borra la cookie segura de este dispositivo y vuelve a la ventana de acceso.
        </p>
        <Button className="mt-4" variant="danger" onClick={logout} disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
          Cerrar sesión
        </Button>
      </section>
    </div>
  );
}
