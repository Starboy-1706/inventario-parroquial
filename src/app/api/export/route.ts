import { NextResponse } from "next/server";
import { asc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { items, storageLocations, zones } from "@/db/schema";
import { apiAuthGuard } from "@/lib/auth";
import { CONDITION_LABELS, STATUS_LABELS, type ItemCondition, type ItemStatus } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '""';
  const str = String(value).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Exporta el inventario completo en formato CSV compatible con Excel.
 * Incluye BOM UTF-8 (\uFEFF) para que Excel respete acentos y caracteres españoles.
 */
export async function GET() {
  const denied = await apiAuthGuard();
  if (denied) return denied;

  const rows = await db
    .select({
      item: items,
      zoneName: zones.name,
      locationName: storageLocations.name,
    })
    .from(items)
    .innerJoin(zones, eq(items.zoneId, zones.id))
    .leftJoin(storageLocations, eq(items.locationId, storageLocations.id))
    .where(ne(items.status, "BAJA"))
    .orderBy(asc(zones.name), asc(items.code));

  const headers = [
    "Código",
    "Nombre",
    "Zona",
    "Ubicación exacta",
    "Lugar exacto",
    "Marca",
    "Modelo",
    "Nº de serie",
    "Material",
    "Color / acabado",
    "Largo (cm)",
    "Ancho (cm)",
    "Alto (cm)",
    "Peso (kg)",
    "Proveedor",
    "Garantía hasta",
    "Código de barras",
    "Tipo",
    "Cantidad",
    "Stock Mínimo",
    "Categoría",
    "Estado",
    "Conservación",
    "Valor Estimado (€)",
    "Fecha Adquisición",
    "Descripción",
    "Notas Internas",
    "Fecha de Alta",
  ];

  const lines = [headers.map((h) => `"${h}"`).join(";")];

  for (const { item, zoneName, locationName } of rows) {
    const row = [
      escapeCsv(item.code),
      escapeCsv(item.name),
      escapeCsv(zoneName),
      escapeCsv(locationName ?? ""),
      escapeCsv(item.locationNote ?? ""),
      escapeCsv(item.brand ?? ""),
      escapeCsv(item.model ?? ""),
      escapeCsv(item.serialNumber ?? ""),
      escapeCsv(item.material ?? ""),
      escapeCsv(item.color ?? ""),
      escapeCsv(item.dimLengthCm ?? ""),
      escapeCsv(item.dimWidthCm ?? ""),
      escapeCsv(item.dimHeightCm ?? ""),
      escapeCsv(item.weightKg ?? ""),
      escapeCsv(item.supplier ?? ""),
      escapeCsv(item.warrantyUntil ? formatDate(item.warrantyUntil) : ""),
      escapeCsv(item.externalBarcode ?? ""),
      escapeCsv(item.itemType === "UNICO" ? "Pieza única" : "Acumulable"),
      escapeCsv(item.quantity),
      escapeCsv(item.minQuantity || ""),
      escapeCsv(item.category),
      escapeCsv(STATUS_LABELS[item.status as ItemStatus] ?? item.status),
      escapeCsv(CONDITION_LABELS[item.condition as ItemCondition] ?? item.condition),
      escapeCsv(item.estimatedValue ?? ""),
      escapeCsv(formatDate(item.acquisitionDate)),
      escapeCsv(item.description ?? ""),
      escapeCsv(item.notes ?? ""),
      escapeCsv(formatDate(item.createdAt)),
    ];
    lines.push(row.join(";"));
  }

  // BOM UTF-8 para apertura directa en Microsoft Excel en español
  const csvContent = "\uFEFF" + lines.join("\r\n");
  const today = new Date().toISOString().slice(0, 10);

  return new Response(csvContent, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="inventario-parroquial-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
