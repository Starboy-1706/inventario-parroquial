import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { auditSessionItems, auditSessions, zones } from "@/db/schema";
import { authPageMetadata, requireAuthenticated } from "@/lib/auth";
import { AuditFinalizeForm } from "@/components/audit-finalize-form";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return authPageMetadata("Finalizar recuento");
}

export default async function FinalizarRecuentoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuthenticated();
  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const [sessionRow] = await db
    .select({ session: auditSessions, zoneName: zones.name, zoneColor: zones.color })
    .from(auditSessions)
    .innerJoin(zones, eq(auditSessions.zoneId, zones.id))
    .where(eq(auditSessions.id, id));
  if (!sessionRow) notFound();

  // Si la sesión ya está cerrada, vuelve directamente al informe.
  if (sessionRow.session.status !== "EN_CURSO") {
    redirect(`/recuento/${id}`);
  }

  const checklist = await db
    .select({ status: auditSessionItems.status })
    .from(auditSessionItems)
    .where(eq(auditSessionItems.auditSessionId, id));

  const verifiedCount = checklist.filter((c) => c.status === "CORRECTO").length;
  const missingCount = checklist.filter((c) => c.status === "FALTANTE").length;
  const discrepanciesCount = checklist.filter(
    (c) =>
      c.status === "DISCREPANCIA_CANTIDAD" ||
      c.status === "FUERA_DE_ZONA" ||
      c.status === "DESCONOCIDO",
  ).length;

  return (
    <AuditFinalizeForm
      sessionId={id}
      zoneName={sessionRow.zoneName}
      zoneColor={sessionRow.zoneColor}
      verifiedCount={verifiedCount}
      missingCount={missingCount}
      discrepanciesCount={discrepanciesCount}
    />
  );
}
