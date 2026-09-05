"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, KeyRound, Loader2, LockKeyhole, ShieldCheck } from "lucide-react";
import { LogoMark } from "@/components/logo";

export function LoginForm({ configured }: { configured: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!password) {
      setError("Escribe la clave de acceso.");
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password,
          next: searchParams.get("next") ?? "/",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No se pudo iniciar sesión.");
        setPassword("");
        return;
      }
      router.replace(data.redirectTo ?? "/");
      router.refresh();
    } catch {
      setError("No se pudo conectar. Revisa tu conexión e inténtalo otra vez.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-ink px-5 py-10">
      <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_30%_20%,#a67c2d_0,transparent_28%),radial-gradient(circle_at_80%_75%,#2e4b3a_0,transparent_30%)]" />
      <div className="relative w-full max-w-md animate-fade-up">
        <div className="mb-6 flex justify-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-gold/30 bg-gold/10 shadow-lift">
            <LogoMark className="h-11 w-11" />
          </span>
        </div>

        <section className="overflow-hidden rounded-3xl border border-white/10 bg-cream shadow-lift">
          <div className="border-b border-line-soft px-6 py-6 text-center sm:px-8">
            <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-gold/10 text-gold-deep">
              <LockKeyhole className="h-4.5 w-4.5" />
            </span>
            <h1 className="mt-3 font-display text-2xl font-semibold tracking-tight text-ink">
              Acceso restringido
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
              Inventario de la Parroquia Santa Bárbara. Introduce la clave para
              entrar.
            </p>
          </div>

          <form onSubmit={submit} className="px-6 py-6 sm:px-8">
            <label className="block">
              <span className="mb-2 block text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-ink-soft">
                Clave de acceso
              </span>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
                <input
                  autoFocus
                  autoComplete="current-password"
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyUp={(e) => setCapsLock(e.getModifierState("CapsLock"))}
                  onKeyDown={(e) => setCapsLock(e.getModifierState("CapsLock"))}
                  maxLength={256}
                  disabled={pending || !configured}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl border border-line bg-white py-3 pl-10 pr-11 text-base text-ink outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20 disabled:bg-stone-100"
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer rounded-full p-2 text-ink-faint transition hover:bg-ink/5 hover:text-ink"
                  aria-label={show ? "Ocultar clave" : "Mostrar clave"}
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            {capsLock && (
              <p className="mt-2 text-xs font-medium text-amber-700">
                Bloq Mayús está activado.
              </p>
            )}
            {!configured && (
              <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs leading-relaxed text-amber-800">
                El administrador aún debe configurar ACCESS_PASSWORD y SESSION_SECRET en Vercel.
              </p>
            )}
            {error && (
              <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending || !configured || !password}
              className="mt-5 inline-flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-full bg-ink px-5 py-3 text-sm font-bold text-cream shadow-lift transition hover:bg-basilica-deep active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4 text-gold-soft" />}
              {pending ? "Verificando…" : "Entrar de forma segura"}
            </button>
          </form>
        </section>

        <p className="mt-5 text-center text-[0.68rem] leading-relaxed text-cream/40">
          Sesión cifrada · Cookie HttpOnly · Bloqueo contra fuerza bruta
        </p>
      </div>
    </main>
  );
}
