"use client";

import Link from "next/link";
import { RotateCcw, Trash2 } from "lucide-react";

export function TrashActions({ id, code }: { id: number; code: string }) {
  void code;
  return (
    <div className="mt-3 flex gap-2 sm:mt-0">
      <Link
        href={`/inventario/${id}/restaurar`}
        className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-full border border-line bg-cream px-3.5 py-1.5 text-xs font-semibold text-ink transition hover:border-ink/25"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Restaurar
      </Link>
      <Link
        href={`/inventario/${id}/borrar`}
        className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-full border border-red-200 bg-red-50 px-3.5 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Borrar
      </Link>
    </div>
  );
}
