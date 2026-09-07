import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditSessionItems, auditSessions, items, zones } from "@/db/schema";
import { authPageMetadata, requireAuthenticated } from "@/lib/auth";
import { AuditLive } from "@/components/audit-live";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return authPageMetadata("Recuento en vivo");
}

type Props = { params: Promise<{ id: string }> };

export default async function RecuentoDetailPage({ params }: Props) {
  await requireAuthenticated();
  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const [sessionRow] = await db
    .select({
      session: auditSessions,
      zoneName: zones.name,
      zoneColor: zones.color,
    })
    .from(auditSessions)
    .innerJoin(zones, eq(auditSessions.zoneId, zones.id))
    .where(eq(auditSessions.id, id));

  if (!sessionRow) notFound();

  const checklist = await db
    .select({
      checkItem: auditSessionItems,
      itemName: items.name,
      itemType: items.itemType,
      itemCategory: items.category,
      itemPhotoId: items.photoId,
    })
    .from(auditSessionItems)
    .leftJoin(items, eq(auditSessionItems.itemId, items.id))
    .where(eq(auditSessionItems.auditSessionId, id))
    .orderBy(asc(auditSessionItems.id));

  const initialData = {
    ...sessionRow.session,
    startedAt: sessionRow.session.startedAt.toISOString(),
    completedAt: sessionRow.session.completedAt?.toISOString() ?? null,
    zoneName: sessionRow.zoneName,
    zoneColor: sessionRow.zoneColor,
    status: sessionRow.session.status as "EN_CURSO" | "COMPLETADO" | "CANCELADO",
    checklist: checklist.map((c) => ({
      ...c.checkItem,
      status: c.checkItem.status as "CORRECTO" | "FALTANTE" | "SOBRANTE" | "DISCREPANCIA_CANTIDAD" | "FUERA_DE_ZONA" | "DESCONOCIDO",
      scannedAt: c.checkItem.scannedAt.toISOString(),
      name: c.itemName ?? c.checkItem.scannedCode,
      itemType: c.itemType ?? "UNICO",
      category: c.itemCategory ?? "General",
      photoId: c.itemPhotoId,
    })),
  };

  return <AuditLive initialData={initialData} />;
}
