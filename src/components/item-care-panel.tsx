"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  Check,
  ChevronDown,
  Hammer,
  Handshake,
  Loader2,
  Plus,
  X,
} from "lucide-react";
import type { Loan, MaintenanceRecord } from "@/db/schema";
import { Button, Field, inputCls } from "@/components/ui";
import { secureFetch } from "@/lib/secure-fetch";
import { cn, formatDate } from "@/lib/utils";

export function ItemCarePanel({
  itemId,
  itemType,
  quantity,
  loans,
  maintenance,
}: {
  itemId: number;
  itemType: string;
  quantity: number;
  loans: Loan[];
  maintenance: MaintenanceRecord[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"loan" | "maintenance">("loan");
  const [formOpen, setFormOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeLoans = loans.filter((loan) => !loan.returnedAt);
  const activeMaintenance = maintenance.filter((record) => !record.completedAt);

  function selectTab(next: "loan" | "maintenance") {
    setTab(next);
    setFormOpen(false);
    setError(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const endpoint = tab === "loan" ? "loans" : "maintenance";

    try {
      const response = await secureFetch(`/api/items/${itemId}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(formData)),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "No se pudo guardar el registro.");
        return;
      }
      form.reset();
      setFormOpen(false);
      router.refresh();
    } catch {
      setError("Error de conexión. Inténtalo otra vez.");
    } finally {
      setPending(false);
    }
  }

  async function finish(endpoint: "loans" | "maintenance", id: number) {
    setPending(true);
    setError(null);
    try {
      const response = await secureFetch(`/api/items/${itemId}/${endpoint}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          endpoint === "loans" ? { loanId: id } : { recordId: id },
        ),
      });
      if (!response.ok) {
        const data = await response.json();
        setError(data.error ?? "No se pudo finalizar el registro.");
        return;
      }
      router.refresh();
    } catch {
      setError("Error de conexión. Inténtalo otra vez.");
    } finally {
      setPending(false);
    }
  }

  const activeCount = tab === "loan" ? activeLoans.length : activeMaintenance.length;

  return (
    <section className="rounded-2xl border border-line bg-cream p-4 shadow-card sm:rounded-3xl sm:p-6">
      {/* Selector compacto de módulo */}
      <div className="grid grid-cols-2 gap-1 rounded-2xl border border-line-soft bg-paper p-1">
        <button
          type="button"
          onClick={() => selectTab("loan")}
          className={cn(
            "flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl px-2 text-xs font-bold transition active:scale-[0.98]",
            tab === "loan"
              ? "bg-ink text-cream shadow-sm"
              : "text-ink-soft hover:bg-cream",
          )}
        >
          <Handshake className="h-4 w-4" />
          Préstamos
          {activeLoans.length > 0 && (
            <span className="rounded-full bg-sky-100 px-1.5 py-0.5 text-[0.6rem] text-sky-800">
              {activeLoans.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => selectTab("maintenance")}
          className={cn(
            "flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl px-2 text-xs font-bold transition active:scale-[0.98]",
            tab === "maintenance"
              ? "bg-ink text-cream shadow-sm"
              : "text-ink-soft hover:bg-cream",
          )}
        >
          <Hammer className="h-4 w-4" />
          Mantenimiento
          {activeMaintenance.length > 0 && (
            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[0.6rem] text-amber-800">
              {activeMaintenance.length}
            </span>
          )}
        </button>
      </div>

      {/* Cabecera contextual */}
      <div className="mt-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">
            {tab === "loan" ? "Préstamos activos" : "Trabajos en curso"}
          </h2>
          <p className="text-[0.68rem] text-ink-soft">
            {activeCount === 0
              ? tab === "loan"
                ? "La pieza no figura prestada."
                : "No hay trabajos de mantenimiento abiertos."
              : `${activeCount} registro${activeCount === 1 ? " activo" : "s activos"}.`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setFormOpen((open) => !open);
            setError(null);
          }}
          className={cn(
            "flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full border px-3 py-2 text-[0.68rem] font-bold transition active:scale-95",
            formOpen
              ? "border-ink/20 bg-ink text-cream"
              : "border-line bg-white text-ink hover:border-gold/40",
          )}
        >
          {formOpen ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {formOpen
            ? "Cerrar"
            : tab === "loan"
              ? "Nuevo préstamo"
              : "Nuevo trabajo"}
        </button>
      </div>

      {/* Registros activos */}
      {tab === "loan" && activeLoans.length > 0 && (
        <ul className="mt-3 space-y-2">
          {activeLoans.map((loan) => (
            <li
              key={loan.id}
              className="rounded-2xl border border-sky-200 bg-sky-50/80 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-sky-950">
                    {loan.borrower}
                  </p>
                  <p className="mt-0.5 text-xs text-sky-900/75">
                    {loan.quantity} ud.{loan.dueAt ? ` · devolución ${formatDate(loan.dueAt)}` : " · sin fecha de devolución"}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => void finish("loans", loan.id)}
                  className="min-h-10 shrink-0 bg-white"
                >
                  <Check className="h-3.5 w-3.5" />
                  Devuelto
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {tab === "maintenance" && activeMaintenance.length > 0 && (
        <ul className="mt-3 space-y-2">
          {activeMaintenance.map((record) => (
            <li
              key={record.id}
              className="rounded-2xl border border-amber-200 bg-amber-50/80 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="line-clamp-2 text-sm font-bold text-amber-950">
                    {record.description}
                  </p>
                  <p className="mt-0.5 text-xs text-amber-900/75">
                    {record.provider ?? "Sin proveedor"}
                    {record.nextReviewAt ? ` · revisión ${formatDate(record.nextReviewAt)}` : ""}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => void finish("maintenance", record.id)}
                  className="min-h-10 shrink-0 bg-white"
                >
                  <Check className="h-3.5 w-3.5" />
                  Finalizar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Formulario desplegable */}
      {formOpen && (
        <form
          onSubmit={submit}
          className="mt-4 animate-fade-in rounded-2xl border border-line bg-paper/70 p-3.5 sm:p-4"
        >
          {tab === "loan" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Prestar a">
                <input
                  name="borrower"
                  required
                  autoFocus
                  placeholder="Persona, parroquia o institución"
                  className={inputCls}
                />
              </Field>
              <Field label="Responsable interno">
                <input name="responsible" placeholder="Quién autoriza" className={inputCls} />
              </Field>
              <Field label="Cantidad">
                <input
                  name="quantity"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={itemType === "CONTABLE" ? quantity : 1}
                  defaultValue={1}
                  className={inputCls}
                />
              </Field>
              <Field label="Devolución prevista">
                <input name="dueAt" type="date" className={inputCls} />
              </Field>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="Trabajo o incidencia">
                  <input
                    name="description"
                    required
                    autoFocus
                    placeholder="Describe la revisión o reparación"
                    className={inputCls}
                  />
                </Field>
              </div>
              <Field label="Taller o restaurador">
                <input name="provider" placeholder="Opcional" className={inputCls} />
              </Field>
              <Field label="Coste (€)">
                <input
                  name="cost"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  placeholder="0,00"
                  className={inputCls}
                />
              </Field>
              <Field label="Fecha de inicio">
                <input
                  name="startedAt"
                  type="date"
                  required
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  className={inputCls}
                />
              </Field>
              <Field label="Próxima revisión">
                <input name="nextReviewAt" type="date" className={inputCls} />
              </Field>
            </div>
          )}

          <Button type="submit" variant="dark" disabled={pending} className="mt-4 min-h-11 w-full sm:w-auto">
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : tab === "loan" ? (
              <Handshake className="h-4 w-4 text-gold-soft" />
            ) : (
              <CalendarClock className="h-4 w-4 text-gold-soft" />
            )}
            {tab === "loan" ? "Registrar préstamo" : "Registrar mantenimiento"}
          </Button>
        </form>
      )}

      {error && (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
    </section>
  );
}
