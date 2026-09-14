import { asc, eq, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { items, storageLocations, zones } from "@/db/schema";
import { authPageMetadata, requireAuthenticated } from "@/lib/auth";
import { LocationManager } from "@/components/location-manager";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return authPageMetadata("Ubicaciones de la zona");
}

export default async function UbicacionesZonaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuthenticated();
  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const [zone] = await db.select().from(zones).where(eq(zones.id, id));
  if (!zone) notFound();

  const locations = await db
    .select({
      id: storageLocations.id,
      parentId: storageLocations.parentId,
      name: storageLocations.name,
      kind: storageLocations.kind,
      itemCount: sql<number>`(
        select count(*)::int from ${items}
        where ${items.locationId} = ${storageLocations.id}
          and ${items.deletedAt} is null
      )`,
    })
    .from(storageLocations)
    .where(eq(storageLocations.zoneId, id))
    .orderBy(asc(storageLocations.name));

  return (
    <LocationManager
      zone={{ id: zone.id, name: zone.name, color: zone.color, icon: zone.icon }}
      locations={locations}
    />
  );
}
