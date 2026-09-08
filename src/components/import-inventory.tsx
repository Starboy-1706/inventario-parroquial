"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { secureFetch } from "@/lib/secure-fetch";
import { Button } from "@/components/ui";

interface ImportRow {
  row: number;
  name: string;
  zoneId?: number;
  zone: string;
  category: string;
  type: string;
  quantity: number;
  status: string;
  condition: string;
  errors: string[];
}

export function ImportInventory() {
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [csv, setCsv] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const invalid = rows.filter((row) => row.errors.length > 0).length;

  async function validate(text: string, commit = false) {
    setPending(true);
    setMessage(null);
    try {
      const response = await secureFetch(`/api/import${commit ? "?commit=1" : ""}`, {
        method: "POST",
        headers: { "Content-Type": "text/csv" },
        body: text,
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error ?? "No se pudo procesar el archivo.");
      } else if (commit) {
        setMessage(`${data.count} artículos importados correctamente.`);
        setRows([]);
        setCsv("");
      } else {
        setRows(data.rows);
        setMessage(`${data.valid} filas válidas · ${data.invalid} con errores.`);
      }
    } catch {
      setMessage("Error de conexión al procesar el archivo.");
    } finally {
      setPending(false);
    }
  }

  async function chooseFile(file: File) {
    const text = await file.text();
    setCsv(text);
    await validate(text);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-5 sm:px-8 sm:py-12">
      <Link href="/inventario" className="inline-flex items-center gap-2 text-xs font-semibold text-ink-soft">
        <ArrowLeft className="h-4 w-4" /> Volver al inventario
      </Link>
      <header className="mt-4">
        <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-gold-deep dark:text-gold-soft">
          Carga masiva
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-ink sm:text-4xl">
          Importar desde Excel
        </h1>
        <p className="mt-1 text-xs leading-relaxed text-ink-soft sm:text-sm">
          Guarda la hoja como CSV UTF-8. Primero se valida y nada se escribe hasta confirmar.
        </p>
      </header>

      <label className="mt-5 flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-line bg-cream p-6 text-center shadow-card transition active:scale-[0.99] hover:border-gold/50 sm:mt-7 sm:rounded-3xl sm:p-10">
        <FileSpreadsheet className="h-9 w-9 text-gold" />
        <span className="mt-3 text-sm font-bold text-ink">Seleccionar archivo CSV</span>
        <span className="mt-1 text-xs text-ink-soft">Exportado desde Microsoft Excel o LibreOffice</span>
        <span className="mt-3 rounded-full border border-line bg-white px-4 py-2 text-xs font-semibold text-ink">
          Elegir archivo
        </span>
        <input
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void chooseFile(file);
          }}
        />
        {pending && <Loader2 className="mt-3 h-5 w-5 animate-spin text-gold-deep" />}
      </label>

      {message && (
        <p className="mt-4 rounded-xl border border-line bg-cream p-3 text-sm font-semibold text-ink">
          {message}
        </p>
      )}

      {rows.length > 0 && (
        <>
          {/* Vista móvil en tarjetas */}
          <ul className="mt-5 space-y-2 sm:hidden">
            {rows.map((row) => (
              <li key={row.row} className="rounded-2xl border border-line bg-cream p-3 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-sm font-semibold text-ink">{row.name || "Sin nombre"}</p>
                    <p className="mt-0.5 text-xs text-ink-soft">Fila {row.row} · {row.zone || "Sin zona"} · {row.quantity} uds.</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[0.62rem] font-bold ${row.errors.length ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
                    {row.errors.length ? "Revisar" : "Válida"}
                  </span>
                </div>
                {row.errors.length > 0 && (
                  <p className="mt-2 text-xs leading-relaxed text-red-700">{row.errors.join(", ")}</p>
                )}
              </li>
            ))}
          </ul>

          {/* Tabla escritorio */}
          <div className="mt-6 hidden overflow-x-auto rounded-2xl border border-line bg-cream shadow-card sm:block">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-paper text-ink-soft">
                  <th className="p-3">Fila</th><th>Nombre</th><th>Zona</th><th>Cantidad</th><th>Resultado</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.row} className="border-t border-line-soft">
                    <td className="p-3">{row.row}</td><td>{row.name}</td><td>{row.zone}</td><td>{row.quantity}</td>
                    <td className={row.errors.length ? "text-red-700" : "text-emerald-700"}>
                      {row.errors.length ? row.errors.join(", ") : "Válida"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Button
            variant="dark"
            className="mt-4 w-full sm:w-auto"
            disabled={pending || invalid > 0}
            onClick={() => void validate(csv, true)}
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Importar {rows.length} artículos
          </Button>
          {invalid > 0 && (
            <p className="mt-2 text-xs text-red-700">
              Corrige las {invalid} filas marcadas y vuelve a seleccionar el archivo.
            </p>
          )}
        </>
      )}
    </div>
  );
}
