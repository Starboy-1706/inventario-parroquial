import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { appSettings, items, storageLocations, zones } from "@/db/schema";
import { LOCATION_KIND_ICONS, type LocationKind } from "@/lib/constants";
import { authPageMetadata, requireAuthenticated } from "@/lib/auth";
import { LabelSheet } from "@/components/label-sheet";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return authPageMetadata("Etiqueta");
}

export default async function EtiquetaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuthenticated();
  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const [row] = await db
    .select({ item: items, zone: zones })
    .from(items)
    .innerJoin(zones, eq(items.zoneId, zones.id))
    .where(eq(items.id, id));

  if (!row) notFound();

  const [[settings], h] = await Promise.all([
    db.select().from(appSettings).where(eq(appSettings.id, 1)),
    headers(),
  ]);
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const protocol =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const baseUrl = `${protocol}://${host}`;

  // Ruta jerárquica de la ubicación exacta para la etiqueta grande
  let locationPath: string | null = null;
  if (row.item.locationId) {
    const zoneLocations = await db
      .select({
        id: storageLocations.id,
        parentId: storageLocations.parentId,
        name: storageLocations.name,
        kind: storageLocations.kind,
      })
      .from(storageLocations)
      .where(eq(storageLocations.zoneId, row.zone.id));
    const byId = new Map(zoneLocations.map((l) => [l.id, l]));
    const chain: string[] = [];
    let cursor = byId.get(row.item.locationId);
    let guard = 0;
    while (cursor && guard++ < 12) {
      chain.unshift(
        `${LOCATION_KIND_ICONS[cursor.kind as LocationKind] ?? ""} ${cursor.name}`.trim(),
      );
      cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined;
    }
    locationPath = chain.join(" → ") || null;
  }
  if (row.item.locationNote) {
    locationPath = locationPath
      ? `${locationPath} · ${row.item.locationNote}`
      : row.item.locationNote;
  }

  return (
    <LabelSheet
      item={row.item}
      zone={row.zone}
      baseUrl={baseUrl}
      parishName={settings?.parishName ?? "Parroquia Santa Bárbara"}
      locationPath={locationPath}
    />
  );
}
