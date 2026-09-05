import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { items, zones } from "@/db/schema";
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

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const protocol =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const baseUrl = `${protocol}://${host}`;

  return <LabelSheet item={row.item} zone={row.zone} baseUrl={baseUrl} />;
}
