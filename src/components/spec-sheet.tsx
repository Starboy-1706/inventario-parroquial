import {
  Barcode,
  Boxes,
  CalendarClock,
  Layers,
  MapPin,
  Package,
  Palette,
  Ruler,
  ShieldCheck,
  Tag,
  Truck,
  Weight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { formatDate, formatItemDimensions } from "@/lib/utils";

type SpecItem = {
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  material: string | null;
  color: string | null;
  weightKg: string | null;
  supplier: string | null;
  warrantyUntil: string | null;
  externalBarcode: string | null;
  category: string;
  dimLengthCm: string | null;
  dimWidthCm: string | null;
  dimHeightCm: string | null;
  quantity: number;
  itemType: string;
};

function formatWeight(value: string | null) {
  if (!value) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n < 1
    ? `${new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(n * 1000)} g`
    : `${new Intl.NumberFormat("es-ES", { maximumFractionDigits: 3 }).format(n)} kg`;
}

/**
 * Ficha técnica del artículo: tabla clara de dos columnas con todos los
 * datos de identificación. Solo muestra los campos informados, salvo los
 * esenciales, que indican «—» para que se vea qué falta por completar.
 */
export function SpecSheet({
  item,
  locationPath,
}: {
  item: SpecItem;
  locationPath?: string | null;
}) {
  const dims = formatItemDimensions(item);
  const weight = formatWeight(item.weightKg);

  const rows: { icon: LucideIcon; label: string; value: string | null; strong?: boolean }[] = [
    { icon: Package, label: "Marca", value: item.brand, strong: true },
    { icon: Layers, label: "Modelo", value: item.model, strong: true },
    { icon: Barcode, label: "Nº de serie", value: item.serialNumber },
    { icon: Barcode, label: "Código de barras", value: item.externalBarcode },
    { icon: Tag, label: "Categoría", value: item.category },
    { icon: Palette, label: "Material", value: item.material },
    { icon: Palette, label: "Color / acabado", value: item.color },
    { icon: Ruler, label: "Medidas (L × An × Al)", value: dims },
    { icon: Weight, label: "Peso", value: weight },
    {
      icon: Boxes,
      label: "Unidades",
      value:
        item.itemType === "CONTABLE"
          ? `${item.quantity} uds.`
          : "1 (pieza única)",
    },
    { icon: MapPin, label: "Ubicación exacta", value: locationPath ?? null },
    { icon: Truck, label: "Proveedor", value: item.supplier },
    {
      icon: ShieldCheck,
      label: "Garantía hasta",
      value: item.warrantyUntil ? formatDate(item.warrantyUntil) : null,
    },
  ];

  // Campos siempre visibles aunque estén vacíos (guían a completar la ficha).
  const alwaysShow = new Set([
    "Marca",
    "Modelo",
    "Categoría",
    "Medidas (L × An × Al)",
    "Unidades",
    "Ubicación exacta",
  ]);
  const visible = rows.filter((r) => r.value || alwaysShow.has(r.label));
  const filled = rows.filter((r) => r.value).length;
  const completion = Math.round((filled / rows.length) * 100);

  return (
    <section className="rounded-2xl border border-line bg-cream p-4 shadow-card sm:rounded-3xl sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-xl font-semibold tracking-tight text-ink">
          Ficha técnica
        </h2>
        <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white/70 px-3 py-1 text-[0.65rem] font-bold text-ink-soft">
          <span className="h-1.5 w-16 overflow-hidden rounded-full bg-line">
            <span
              className="block h-full rounded-full bg-gold"
              style={{ width: `${completion}%` }}
            />
          </span>
          {completion}% completa
        </span>
      </div>

      <dl className="mt-4 overflow-hidden rounded-2xl border border-line-soft bg-white/60">
        {visible.map((row, index) => (
          <div
            key={row.label}
            className={`grid grid-cols-[9.5rem_minmax(0,1fr)] gap-3 px-3.5 py-2.5 sm:grid-cols-[12rem_minmax(0,1fr)] sm:px-4 ${
              index % 2 === 1 ? "bg-paper/40" : ""
            }`}
          >
            <dt className="flex items-center gap-1.5 text-[0.66rem] font-semibold uppercase tracking-[0.1em] text-ink-faint">
              <row.icon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{row.label}</span>
            </dt>
            <dd
              className={`min-w-0 break-words text-sm ${
                row.value
                  ? row.strong
                    ? "font-semibold text-ink"
                    : "text-ink"
                  : "italic text-ink-faint"
              }`}
            >
              {row.value ?? "Sin registrar"}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
