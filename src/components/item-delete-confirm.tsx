"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { Button, inputCls } from "@/components/ui";
import { secureFetch } from "@/lib/secure-fetch";
import { cn } from "@/lib/utils";

/** Confirmación de envío a papelera como página completa (sin ventanas flotantes). */
export function ItemDeleteConfirm({
  id,
  code,
  name,
}: {
  id: number;
  code: string;
  name: string;
}) {
  const router = useRouter();
  const [confirmCode, setConfirmCode] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    if (confirmCode.trim().toUpperCase() !== code) return;
    setDeleting(true);
    setError(null);
    const res = await secureFetch(`/api/items/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        confirmationCode: confirmCode.trim().toUpperCase(),
        reason: "Eliminado desde la ficha",
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo eliminar.");
      setDeleting(false);
      return;
    }
    router.push("/inventario");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-8 sm:py-16">
      <div className="animate-fade-up rounded-3xl border border-red-200 bg-cream p-6 shadow-card sm:p-8">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-700">
          <Trash2 className="h-5 w-5" />
        </span>
        <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Enviar a la papelera
        </h1>
        <p className="mt-1 font-mono text-xs font-bold tracking-[0.2em] text-ink-soft">
          {code} · {name}
        </p>

        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm leading-relaxed text-amber-900">
          El artículo pasará a la <strong>papelera</strong>. No se perderá su
          historial y podrás restaurarlo. El borrado definitivo se realiza
          exclusivamente desde la papelera.
        </div>

        <p className="mt-5 text-sm leading-relaxed text-ink-soft">
          Para mover <strong className="text-ink">{name}</strong> a la papelera,
          escribe su código exactamente:
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void remove();
          }}
        >
          <input
            value={confirmCode}
            onChange={(e) => setConfirmCode(e.target.value.toUpperCase())}
            placeholder={code}
            autoComplete="off"
            autoFocus
            className={cn(
              inputCls,
              "mt-3 text-center font-mono text-base font-bold tracking-[0.2em]",
            )}
          />
          <p className="mt-1.5 text-center text-xs text-ink-faint">
            Escribe <span className="font-mono font-semibold text-ink">{code}</span>{" "}
            para habilitar el borrado
          </p>

          {error && (
            <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-medium text-red-700">
              {error}
            </p>
          )}

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Link
              href={`/inventario/${id}`}
              className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-ink-soft transition hover:bg-ink/5 hover:text-ink"
            >
              Cancelar
            </Link>
            <Button
              type="submit"
              variant="danger"
              disabled={deleting || confirmCode.trim().toUpperCase() !== code}
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Enviar a la papelera
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
