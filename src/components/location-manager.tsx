"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  CornerDownRight,
  Loader2,
  Plus,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import { Button, Field, inputCls, ZoneIcon } from "@/components/ui";
import { secureFetch } from "@/lib/secure-fetch";
import {
  LOCATION_KINDS,
  LOCATION_KIND_ICONS,
  LOCATION_KIND_LABELS,
  type LocationKind,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

export type LocationNode = {
  id: number;
  parentId: number | null;
  name: string;
  kind: string;
  itemCount: number;
};

function kindLabel(kind: string) {
  return LOCATION_KIND_LABELS[kind as LocationKind] ?? "Otro";
}
function kindIcon(kind: string) {
  return LOCATION_KIND_ICONS[kind as LocationKind] ?? "📍";
}

/**
 * Gestión de ubicaciones exactas dentro de una zona: armarios, archiveros,
 * estantes, cajones, vitrinas… con anidamiento (armario → balda → caja).
 * Todo ocurre en la propia página, sin ventanas flotantes.
 */
export function LocationManager({
  zone,
  locations,
}: {
  zone: { id: number; name: string; color: string; icon: string };
  locations: LocationNode[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<string>("ARMARIO");
  const [parentId, setParentId] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editKind, setEditKind] = useState("OTRO");

  const roots = locations.filter((l) => l.parentId === null);
  const childrenOf = (id: number) => locations.filter((l) => l.parentId === id);

  function notice(message: string) {
    setFlash(message);
    setTimeout(() => setFlash(null), 3000);
  }

  async function createLocation(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Escribe un nombre (ej. Armario de ornamentos, Archivero A).");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await secureFetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zoneId: zone.id, parentId, name: trimmed, kind }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No se pudo crear la ubicación.");
        return;
      }
      setName("");
      notice(`«${trimmed}» añadido.`);
      router.refresh();
    } catch {
      setError("Error de conexión.");
    } finally {
      setPending(false);
    }
  }

  async function saveEdit(id: number) {
    const trimmed = editName.trim();
    if (!trimmed) return;
    setPending(true);
    setError(null);
    const res = await secureFetch(`/api/locations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed, kind: editKind }),
    });
    const data = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo guardar.");
      return;
    }
    setEditingId(null);
    notice("Ubicación actualizada.");
    router.refresh();
  }

  async function removeLocation(id: number) {
    setPending(true);
    setError(null);
    const res = await secureFetch(`/api/locations/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo eliminar.");
      return;
    }
    notice("Ubicación eliminada.");
    router.refresh();
  }

  function renderRow(loc: LocationNode, depth: number) {
    const isEditing = editingId === loc.id;
    const kids = childrenOf(loc.id);
    return (
      <li key={loc.id} className="border-t border-line-soft first:border-t-0">
        <div
          className="flex flex-wrap items-center gap-2 px-3 py-2.5 transition hover:bg-paper/60 sm:px-4"
          style={{ paddingLeft: `${0.75 + depth * 1.5}rem` }}
        >
          {depth > 0 && (
            <CornerDownRight className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
          )}
          <span className="text-base leading-none">{kindIcon(loc.kind)}</span>

          {isEditing ? (
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={100}
                autoFocus
                className={cn(inputCls, "h-10 min-w-40 flex-1 py-1.5 text-sm")}
              />
              <select
                value={editKind}
                onChange={(e) => setEditKind(e.target.value)}
                className={cn(inputCls, "h-10 w-44 py-1.5 text-sm")}
              >
                {LOCATION_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {LOCATION_KIND_LABELS[k]}
                  </option>
                ))}
              </select>
              <button
                onClick={() => void saveEdit(loc.id)}
                disabled={pending}
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100"
                aria-label="Guardar"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                onClick={() => setEditingId(null)}
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-line bg-white text-ink-soft transition hover:text-ink"
                aria-label="Cancelar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{loc.name}</p>
                <p className="text-[0.68rem] text-ink-soft">
                  {kindLabel(loc.kind)}
                  {loc.itemCount > 0 && (
                    <span className="ml-1.5 font-semibold text-gold-deep">
                      · {loc.itemCount} artículo{loc.itemCount === 1 ? "" : "s"}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  onClick={() => {
                    setParentId(loc.id);
                    setKind(loc.kind === "ARMARIO" ? "ESTANTE" : "CAJA");
                    document
                      .getElementById("nueva-ubicacion")
                      ?.scrollIntoView({ behavior: "smooth", block: "center" });
                  }}
                  className="inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-full border border-line bg-white px-2.5 text-[0.65rem] font-bold text-ink-soft transition hover:border-gold/40 hover:text-gold-deep"
                  title={`Añadir algo dentro de ${loc.name}`}
                >
                  <Plus className="h-3 w-3" />
                  Dentro
                </button>
                <button
                  onClick={() => {
                    setEditingId(loc.id);
                    setEditName(loc.name);
                    setEditKind(loc.kind);
                  }}
                  className="inline-flex min-h-9 cursor-pointer items-center rounded-full border border-line bg-white px-2.5 text-[0.65rem] font-bold text-ink-soft transition hover:text-ink"
                >
                  Renombrar
                </button>
                <button
                  onClick={() => void removeLocation(loc.id)}
                  disabled={pending}
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-line bg-white text-ink-soft transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                  aria-label={`Eliminar ${loc.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </>
          )}
        </div>
        {kids.length > 0 && <ul>{kids.map((k) => renderRow(k, depth + 1))}</ul>}
      </li>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-5 sm:px-8 lg:py-12">
      <Link
        href="/zonas"
        className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft transition hover:text-ink active:scale-95"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver a zonas
      </Link>

      <header className="mt-4 flex items-center gap-3 animate-fade-up">
        <ZoneIcon icon={zone.icon} color={zone.color} size="lg" />
        <div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-gold">
            {zone.name}
          </p>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-4xl">
            Ubicaciones exactas
          </h1>
        </div>
      </header>
      <p className="mt-2 max-w-2xl text-xs leading-relaxed text-ink-soft sm:text-sm">
        Define dónde se guardan las cosas dentro de esta zona: armarios,
        archiveros, estanterías, cajones, vitrinas… Puedes anidarlas
        (Armario → Balda 2 → Caja de corporales) y luego asignarlas a cada
        artículo desde su ficha.
      </p>

      {flash && (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700">
          {flash}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700"
        >
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      {/* ---------- Alta de ubicación ---------- */}
      <section
        id="nueva-ubicacion"
        className="mt-6 animate-fade-up rounded-3xl border border-line bg-cream p-5 shadow-card sm:p-6"
      >
        <h2 className="text-[0.66rem] font-bold uppercase tracking-[0.2em] text-gold-deep">
          Añadir ubicación
        </h2>
        <form onSubmit={createLocation} className="mt-4 grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                placeholder="Ej. Armario de ornamentos, Archivero A, Cajón 3"
                className={inputCls}
              />
            </Field>
            <Field label="Tipo">
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value)}
                className={inputCls}
              >
                {LOCATION_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {LOCATION_KIND_ICONS[k]} {LOCATION_KIND_LABELS[k]}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field
            label="Dentro de"
            hint="Déjalo en «Directamente en la zona» para un mueble principal"
          >
            <select
              value={parentId ?? ""}
              onChange={(e) => setParentId(e.target.value ? Number(e.target.value) : null)}
              className={inputCls}
            >
              <option value="">Directamente en la zona ({zone.name})</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.parentId ? "↳ " : ""}
                  {kindIcon(l.kind)} {l.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="flex justify-end">
            <Button type="submit" variant="dark" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 text-gold-soft" />}
              Añadir ubicación
            </Button>
          </div>
        </form>
      </section>

      {/* ---------- Árbol de ubicaciones ---------- */}
      <section className="mt-5 animate-fade-up">
        <h2 className="font-display text-xl font-semibold tracking-tight text-ink">
          Ubicaciones de {zone.name}{" "}
          <span className="font-sans text-sm font-normal text-ink-soft">
            ({locations.length})
          </span>
        </h2>
        {locations.length === 0 ? (
          <div className="mt-3 rounded-3xl border border-dashed border-line bg-cream/70 p-8 text-center">
            <p className="text-3xl">🗄️</p>
            <p className="mt-2 font-semibold text-ink">Aún no hay ubicaciones</p>
            <p className="mx-auto mt-1 max-w-sm text-xs text-ink-soft">
              Empieza creando los muebles principales de la estancia: armarios,
              archiveros o estanterías. Después podrás añadir baldas y cajones dentro.
            </p>
          </div>
        ) : (
          <ul className="mt-3 overflow-hidden rounded-3xl border border-line bg-cream shadow-card">
            {roots.map((r) => renderRow(r, 0))}
          </ul>
        )}
      </section>
    </div>
  );
}
