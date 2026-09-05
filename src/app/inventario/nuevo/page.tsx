import { asc } from "drizzle-orm";
import { db } from "@/db";
import { zones } from "@/db/schema";
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
  const allZones = await db.select().from(zones).orderBy(asc(zones.name));
  const preselect = sp.zona ? Number(sp.zona) : undefined;

  return (
    <ItemCreateForm
      zones={allZones}
      defaultZoneId={
        preselect && allZones.some((z) => z.id === preselect) ? preselect : undefined
      }
    />
  );
}
