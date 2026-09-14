import { and, asc, eq, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { items, zones } from "@/db/schema";
import { authPageMetadata, requireAuthenticated } from "@/lib/auth";
import { ItemEditForm } from "@/components/item-edit-form";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return authPageMetadata("Editar artículo");
}

export default async function EditarArticuloPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuthenticated();
  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const [item, allZones] = await Promise.all([
    db
      .select()
      .from(items)
      .where(and(eq(items.id, id), isNull(items.deletedAt)))
      .then((rows) => rows[0]),
    db.select().from(zones).orderBy(asc(zones.name)),
  ]);
  if (!item) notFound();

  return <ItemEditForm item={item} zones={allZones} />;
}
