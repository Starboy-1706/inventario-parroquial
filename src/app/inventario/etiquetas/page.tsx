import { asc, eq, inArray, isNull, and } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db";
import { appSettings, items, zones } from "@/db/schema";
import { authPageMetadata, requireAuthenticated } from "@/lib/auth";
import { BulkLabels } from "@/components/bulk-labels";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return authPageMetadata("Etiquetas por lote");
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  await requireAuthenticated();
  const { ids: raw } = await searchParams;
  const ids = (raw ?? "")
    .split(",")
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0)
    .slice(0, 60);
  const rows = ids.length
    ? await db
        .select({
          id: items.id,
          code: items.code,
          name: items.name,
          itemType: items.itemType,
          quantity: items.quantity,
          zoneName: zones.name,
          zoneColor: zones.color,
        })
        .from(items)
        .innerJoin(zones, eq(items.zoneId, zones.id))
        .where(and(inArray(items.id, ids), isNull(items.deletedAt)))
        .orderBy(asc(items.name))
    : [];

  const [[settings], h] = await Promise.all([
    db.select().from(appSettings).where(eq(appSettings.id, 1)),
    headers(),
  ]);
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const protocol =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");

  return (
    <BulkLabels
      items={rows}
      baseUrl={`${protocol}://${host}`}
      parishName={settings?.parishName ?? "Parroquia Santa Bárbara"}
    />
  );
}
