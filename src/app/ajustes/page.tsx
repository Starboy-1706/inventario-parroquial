import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { appSettings, categories, storageLocations, zones } from "@/db/schema";
import { authPageMetadata, requireAuthenticated } from "@/lib/auth";
import { SettingsManager } from "@/components/settings-manager";

export const dynamic = "force-dynamic";
export async function generateMetadata() { return authPageMetadata("Ajustes"); }
export default async function AjustesPage() {
  await requireAuthenticated();
  const [[settings], categoryRows, zoneRows, locations] = await Promise.all([
    db.select().from(appSettings).where(eq(appSettings.id, 1)),
    db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.name)),
    db.select().from(zones).orderBy(asc(zones.name)),
    db.select().from(storageLocations).orderBy(asc(storageLocations.name)),
  ]);
  return <SettingsManager settings={settings} categories={categoryRows} zones={zoneRows} locations={locations} />;
}
