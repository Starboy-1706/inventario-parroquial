import { asc } from "drizzle-orm";
import { db } from "@/db";
import { zones } from "@/db/schema";
import { authPageMetadata, requireAuthenticated } from "@/lib/auth";
import { ZoneCreateForm } from "@/components/zone-create-form";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return authPageMetadata("Nueva zona");
}

export default async function NuevaZonaPage() {
  await requireAuthenticated();
  const allZones = await db.select().from(zones).orderBy(asc(zones.name));
  return <ZoneCreateForm existingZones={allZones} />;
}
