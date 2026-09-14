import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { zones } from "@/db/schema";
import { authPageMetadata, requireAuthenticated } from "@/lib/auth";
import { ZoneEditForm } from "@/components/zone-edit-form";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return authPageMetadata("Editar zona");
}

export default async function EditarZonaPage({
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

  return <ZoneEditForm zone={zone} />;
}
