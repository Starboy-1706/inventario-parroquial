"use client";
import { TriangleAlert } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Solo se loguea al administrador en consola de servidor; nunca al visitante.
  if (typeof window !== "undefined") {
    try {
      console.warn("[app:error]", error.message, error.digest ? `(digest: ${error.digest})` : "");
    } catch {
      /* silent */
    }
  }

  return (
    <div className="flex min-h-[70dvh] items-center justify-center px-5">
      <div className="max-w-md rounded-3xl border border-red-200 bg-cream p-8 text-center shadow-card">
        <TriangleAlert className="mx-auto h-8 w-8 text-red-600" />
        <h1 className="mt-3 font-display text-2xl font-semibold">
          No pudimos cargar esta sección
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          Es un problema temporal del servidor o de la base de datos. Tus datos
          no se han modificado y están a salvo. El sistema intentará repararse
          automáticamente al siguiente intento.
        </p>
        <button
          onClick={reset}
          className="mt-5 cursor-pointer rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-cream transition hover:bg-basilica-deep"
        >
          Intentar de nuevo
        </button>
      </div>
    </div>
  );
}
