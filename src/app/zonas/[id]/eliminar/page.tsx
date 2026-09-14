import { notFound } from "next/navigation";
import { authPageMetadata, requireAuthenticated } from "@/lib/auth";
import { getZonesWithCounts } from "@/lib/queries";
import { ZoneDeleteForm } from "@/components/zone-delete-form";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return authPageMetadata("Eliminar zona");
}

export default async function EliminarZonaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuthenticated();
  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const all = await getZonesWithCounts();
  const zone = all.find((z) => z.id === id);
  if (!zone) notFound();
  const destinations = all
    .filter((z) => z.id !== id)
    .map((z) => ({ id: z.id, name: z.name }));

  return <ZoneDeleteForm zone={zone} destinations={destinations} />;
}
