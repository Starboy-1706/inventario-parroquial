import { and, asc, eq, isNull } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { appSettings, items, zones } from "@/db/schema";
import { authPageMetadata, requireAuthenticated } from "@/lib/auth";
import { ZoneLabelsSheet } from "@/components/zone-labels-sheet";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return authPageMetadata("Etiquetas por zona");
}

export default async function ZoneLabelsPage({
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

  const [zoneItems, [settings]] = await Promise.all([
    db
      .select({
        id: items.id,
        code: items.code,
        name: items.name,
        quantity: items.quantity,
        itemType: items.itemType,
      })
      .from(items)
      .where(and(eq(items.zoneId, id), isNull(items.deletedAt)))
      .orderBy(asc(items.name)),
    db.select().from(appSettings).where(eq(appSettings.id, 1)),
  ]);

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");

  return (
    <ZoneLabelsSheet
      zoneName={zone.name}
      zoneColor={zone.color}
      items={zoneItems}
      parishName={settings?.parishName ?? "Parroquia Santa Bárbara"}
      baseUrl={`${proto}://${host}`}
    />
  );
}
