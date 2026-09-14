"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw, Trash2 } from "lucide-react";
import { Button, inputCls } from "@/components/ui";
import { secureFetch } from "@/lib/secure-fetch";
import { cn } from "@/lib/utils";

/** Restauración o borrado definitivo como página completa (sin ventanas flotantes). */
export function TrashActionForm({
  id,
  code,
  name,
  mode,
}: {
  id: number;
  code: string;
  name: string;
  mode: "restore" | "delete";
}) {
  const router = useRouter();
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isDelete = mode === "delete";

  async function execute() {
    if (confirmation.trim().toUpperCase() !== code) return;
    setPending(true);
    setError(null);
    const res = await secureFetch(`/api/items/${id}/trash`, {
      method: isDelete ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmationCode: code }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "No se pudo completar la operación.");
      setPending(false);
      return;
    }
    router.push(isDelete ? "/inventario/papelera" : `/inventario/${id}`);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-8 sm:py-16">
      <div
        className={cn(
          "animate-fade-up rounded-3xl border bg-cream p-6 shadow-card sm:p-8",
          isDelete ? "border-red-200" : "border-emerald-200",
        )}
      >
        <span
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-2xl",
            isDelete ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700",
          )}
        >
          {isDelete ? <Trash2 className="h-5 w-5" /> : <RotateCcw className="h-5 w-5" />}
        </span>
        <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          {isDelete ? "Borrado definitivo" : "Restaurar artículo"}
        </h1>
        <p className="mt-1 font-mono text-xs font-bold tracking-[0.2em] text-ink-soft">
          {code} · {name}
        </p>
        <p className="mt-4 text-sm leading-relaxed text-ink-soft">
          {isDelete
            ? "Esta acción borrará definitivamente la ficha y su historial. No puede deshacerse."
            : "El artículo volverá al inventario activo conservando todo su historial."}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Confirma escribiendo el código{" "}
          <span className="font-mono font-bold text-ink">{code}</span>:
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void execute();
          }}
        >
          <input
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value.toUpperCase())}
            placeholder={code}
            autoComplete="off"
            autoFocus
            className={cn(
              inputCls,
              "mt-3 text-center font-mono text-base font-bold tracking-widest",
            )}
          />
          {error && (
            <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-medium text-red-700">
              {error}
            </p>
          )}
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Link
              href="/inventario/papelera"
              className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-ink-soft transition hover:bg-ink/5 hover:text-ink"
            >
              Cancelar
            </Link>
            <Button
              type="submit"
              variant={isDelete ? "danger" : "dark"}
              disabled={pending || confirmation.trim().toUpperCase() !== code}
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isDelete ? "Eliminar definitivamente" : "Restaurar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
