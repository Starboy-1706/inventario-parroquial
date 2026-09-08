"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  FolderTree,
  Layers3,
  Loader2,
  Plus,
  Save,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from "lucide-react";
import type { AppSetting, Category, StorageLocation, Zone } from "@/db/schema";
import { Button, Field, inputCls } from "@/components/ui";
import { secureFetch } from "@/lib/secure-fetch";

export function SettingsManager({
  settings,
  categories,
  zones,
  locations,
}: {
  settings: AppSetting;
  categories: Category[];
  zones: Zone[];
  locations: StorageLocation[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [locationName, setLocationName] = useState("");
  const [zoneId, setZoneId] = useState(zones[0]?.id ?? 0);
  const [parentId, setParentId] = useState(0);

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const formData = new FormData(event.currentTarget);
    try {
      const response = await secureFetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(formData)),
      });
      const data = await response.json();
      setMessage(response.ok ? "Ajustes guardados correctamente." : data.error);
      if (response.ok) router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function addCategory(event: FormEvent) {
    event.preventDefault();
    if (!categoryName.trim()) return;
    setPending(true);
    try {
      const response = await secureFetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: categoryName }),
      });
      const data = await response.json();
      setMessage(response.ok ? "Categoría creada." : data.error);
      if (response.ok) {
        setCategoryName("");
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }

  async function toggleCategory(category: Category) {
    await secureFetch("/api/categories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: category.id, active: !category.active }),
    });
    router.refresh();
  }

  async function addLocation(event: FormEvent) {
    event.preventDefault();
    if (!locationName.trim() || !zoneId) return;
    setPending(true);
    try {
      const response = await secureFetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: locationName,
          zoneId,
          parentId: parentId || null,
          kind: parentId ? "ESTANTE" : "ARMARIO",
        }),
      });
      const data = await response.json();
      setMessage(
        response.ok
          ? "Ubicación creada."
          : data.error ?? "No se pudo crear la ubicación.",
      );
      if (response.ok) {
        setLocationName("");
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }

  async function deleteLocation(id: number) {
    const response = await secureFetch(`/api/locations/${id}`, { method: "DELETE" });
    const data = await response.json();
    setMessage(response.ok ? "Ubicación eliminada." : data.error);
    if (response.ok) router.refresh();
  }

  const locationsInZone = locations.filter((location) => location.zoneId === zoneId);

  return (
    <div className="mx-auto max-w-4xl px-4 py-5 sm:px-8 sm:py-12">
      <header>
        <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-gold-deep dark:text-gold-soft">
          Configuración
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-ink sm:text-4xl">
          Ajustes
        </h1>
        <p className="mt-1 text-xs leading-relaxed text-ink-soft sm:text-sm">
          Personaliza la parroquia, categorías y lugares exactos sin modificar código.
        </p>
      </header>

      {message && (
        <p className="mt-4 rounded-xl border border-line bg-cream px-4 py-3 text-sm font-semibold text-ink shadow-sm">
          {message}
        </p>
      )}

      <form onSubmit={saveSettings} className="mt-5 rounded-2xl border border-line bg-cream p-4 shadow-card sm:mt-7 sm:rounded-3xl sm:p-6">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-gold-deep" />
          <h2 className="font-display text-lg font-semibold text-ink sm:text-xl">Parroquia y códigos</h2>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Nombre de la parroquia">
            <input name="parishName" defaultValue={settings.parishName} className={inputCls} />
          </Field>
          <Field label="Prefijo de inventario">
            <input name="inventoryPrefix" defaultValue={settings.inventoryPrefix} maxLength={6} className={`${inputCls} font-mono uppercase`} />
          </Field>
          <Field label="Dirección">
            <input name="address" defaultValue={settings.address ?? ""} className={inputCls} />
          </Field>
          <Field label="Pie de etiqueta">
            <input name="labelFooter" defaultValue={settings.labelFooter ?? ""} className={inputCls} />
          </Field>
        </div>
        <Button type="submit" variant="dark" className="mt-4 w-full sm:w-auto" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar ajustes
        </Button>
      </form>

      <section className="mt-5 rounded-2xl border border-line bg-cream p-4 shadow-card sm:mt-6 sm:rounded-3xl sm:p-6">
        <div className="flex items-center gap-2">
          <Layers3 className="h-5 w-5 text-gold-deep" />
          <h2 className="font-display text-lg font-semibold text-ink sm:text-xl">Categorías</h2>
        </div>
        <form onSubmit={addCategory} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input value={categoryName} onChange={(e) => setCategoryName(e.target.value)} placeholder="Nueva categoría" className={inputCls} />
          <Button type="submit" className="w-full sm:w-auto" disabled={pending || !categoryName.trim()}>
            <Plus className="h-4 w-4" /> Añadir
          </Button>
        </form>
        <ul className="mt-4 divide-y divide-line-soft">
          {categories.map((category) => (
            <li key={category.id} className="flex min-h-12 items-center gap-3 py-2">
              <span className={`min-w-0 flex-1 truncate text-sm ${category.active ? "text-ink" : "text-ink-faint line-through"}`}>
                {category.name}
              </span>
              <button
                type="button"
                onClick={() => void toggleCategory(category)}
                className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-ink-soft transition active:scale-90 hover:bg-gold/10"
                aria-label={category.active ? "Desactivar categoría" : "Activar categoría"}
              >
                {category.active ? <ToggleRight className="h-6 w-6 text-emerald-600" /> : <ToggleLeft className="h-6 w-6" />}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-5 rounded-2xl border border-line bg-cream p-4 shadow-card sm:mt-6 sm:rounded-3xl sm:p-6">
        <div className="flex items-center gap-2">
          <FolderTree className="h-5 w-5 text-gold-deep" />
          <h2 className="font-display text-lg font-semibold text-ink sm:text-xl">
            Armarios, estantes y cajas
          </h2>
        </div>
        <p className="mt-1 text-xs text-ink-soft">
          Crea la jerarquía que luego aparecerá como ubicación detallada en los artículos.
        </p>
        <form onSubmit={addLocation} className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <select value={zoneId} onChange={(e) => { setZoneId(Number(e.target.value)); setParentId(0); }} className={inputCls}>
            {zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}
          </select>
          <select value={parentId} onChange={(e) => setParentId(Number(e.target.value))} className={inputCls}>
            <option value={0}>Sin padre (armario)</option>
            {locationsInZone.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
          </select>
          <input value={locationName} onChange={(e) => setLocationName(e.target.value)} placeholder="Nombre del lugar" className={inputCls} />
          <Button type="submit" className="w-full" disabled={pending || !locationName.trim() || !zoneId}>
            <Plus className="h-4 w-4" /> Crear
          </Button>
        </form>
        <ul className="mt-4 divide-y divide-line-soft">
          {locations.map((location) => (
            <li key={location.id} className="flex min-h-12 items-center gap-3 py-2 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink">{location.parentId ? "↳ " : ""}{location.name}</p>
                <p className="truncate text-[0.68rem] text-ink-faint">{zones.find((zone) => zone.id === location.zoneId)?.name ?? "Zona"}</p>
              </div>
              <button
                type="button"
                onClick={() => void deleteLocation(location.id)}
                className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-ink-faint transition active:scale-90 hover:bg-red-50 hover:text-red-600"
                aria-label={`Eliminar ${location.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
