import { NextResponse } from "next/server";
import { asc, desc } from "drizzle-orm";
import { db } from "@/db";
import {
  appSettings,
  auditSessionItems,
  auditSessions,
  categories,
  itemCodeAliases,
  itemPhotos,
  items,
  loans,
  maintenanceRecords,
  movements,
  storageLocations,
  zones,
} from "@/db/schema";
import { apiAuthGuard } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await apiAuthGuard();
  if (denied) return denied;

  const [
    settingsRows,
    zoneRows,
    categoryRows,
    locationRows,
    itemRows,
    aliasRows,
    photoRows,
    movementRows,
    loanRows,
    maintenanceRows,
    auditRows,
    auditItemRows,
  ] = await Promise.all([
    db.select().from(appSettings),
    db.select().from(zones).orderBy(asc(zones.name)),
    db.select().from(categories).orderBy(asc(categories.name)),
    db.select().from(storageLocations),
    db.select().from(items).orderBy(asc(items.id)),
    db.select().from(itemCodeAliases),
    db.select().from(itemPhotos),
    db.select().from(movements).orderBy(desc(movements.createdAt)),
    db.select().from(loans),
    db.select().from(maintenanceRecords),
    db.select().from(auditSessions).orderBy(desc(auditSessions.startedAt)),
    db.select().from(auditSessionItems),
  ]);

  const backupData = {
    version: 2,
    exportedAt: new Date().toISOString(),
    parish: settingsRows[0]?.parishName ?? "Parroquia Santa Bárbara",
    data: {
      settings: settingsRows[0] ?? null,
      zones: zoneRows,
      categories: categoryRows,
      storageLocations: locationRows,
      items: itemRows,
      aliases: aliasRows,
      itemPhotos: photoRows,
      movements: movementRows,
      loans: loanRows,
      maintenance: maintenanceRows,
      auditSessions: auditRows,
      auditSessionItems: auditItemRows,
    },
    counts: {
      zones: zoneRows.length,
      items: itemRows.length,
      movements: movementRows.length,
      loans: loanRows.length,
      maintenance: maintenanceRows.length,
      auditSessions: auditRows.length,
    },
  };

  const today = new Date().toISOString().slice(0, 10);
  const jsonContent = JSON.stringify(backupData, null, 2);

  return new Response(jsonContent, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="respaldo-parroquia-santa-barbara-${today}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
