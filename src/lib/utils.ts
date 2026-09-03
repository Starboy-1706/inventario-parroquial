import clsx from "clsx";

export function cn(...inputs: Parameters<typeof clsx>) {
  return clsx(...inputs);
}

/** URL pública de una fotografía almacenada en la base de datos. */
export function photoUrl(id: number | null | undefined) {
  return id ? `/api/photos/${id}` : null;
}

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Prefijo de código a partir del nombre de la zona: "Sacristía" → "SAC" */
export function zonePrefix(name: string) {
  const clean = slugify(name).replace(/-/g, "").toUpperCase();
  return (clean.slice(0, 3) || "INV").padEnd(3, "X");
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatMoney(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "—";
  const n = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function timeAgo(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  const diff = Date.now() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "ahora mismo";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `hace ${days} ${days === 1 ? "día" : "días"}`;
  return formatDate(d);
}

/** Extrae un código de inventario desde texto escaneado (código plano o URL). */
export function extractCode(raw: string): string {
  const text = raw.trim();
  try {
    const url = new URL(text);
    const fromQuery = url.searchParams.get("code") ?? url.searchParams.get("codigo");
    if (fromQuery) return fromQuery.trim().toUpperCase();
    const parts = url.pathname.split("/").filter(Boolean);
    const last = parts[parts.length - 1];
    if (last) return decodeURIComponent(last).trim().toUpperCase();
  } catch {
    // no es una URL → se trata como código plano
  }
  return text.toUpperCase();
}
