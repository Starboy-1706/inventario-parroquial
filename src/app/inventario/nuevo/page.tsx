import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { categories, storageLocations, zones } from "@/db/schema";
import { authPageMetadata, requireAuthenticated } from "@/lib/auth";
import { ItemCreateForm } from "@/components/item-create-form";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return authPageMetadata("Nuevo artículo");
}

export default async function NuevoArticuloPage({
  searchParams,
}: {
  searchParams: Promise<{ zona?: string }>;
}) {
  await requireAuthenticated();
  const sp = await searchParams;
  const [allZones, categoryRows, locations] = await Promise.all([
    db.select().from(zones).orderBy(asc(zones.name)),
    db.select().from(categories).where(eq(categories.active, true)).orderBy(asc(categories.sortOrder), asc(categories.name)),
    db.select().from(storageLocations).orderBy(asc(storageLocations.name)),
  ]);
  const preselect = sp.zona ? Number(sp.zona) : undefined;

  return (
    <ItemCreateForm
      zones={allZones}
      categories={categoryRows}
      locations={locations}
      defaultZoneId={
        preselect && allZones.some((z) => z.id === preselect) ? preselect : undefined
      }
    />
  );
}
