import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditSessions, zones } from "@/db/schema";
import { authPageMetadata, requireAuthenticated } from "@/lib/auth";
import { AuditHub } from "@/components/audit-hub";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return authPageMetadata("Modo Recuento");
}

export default async function RecuentoPage() {
  await requireAuthenticated();

  const [sessionRows, zoneRows] = await Promise.all([
    db
      .select({
        session: auditSessions,
        zoneName: zones.name,
        zoneColor: zones.color,
      })
      .from(auditSessions)
      .innerJoin(zones, eq(auditSessions.zoneId, zones.id))
      .orderBy(desc(auditSessions.startedAt))
      .limit(30),
    db.select().from(zones).orderBy(asc(zones.name)),
  ]);

  return (
    <AuditHub
      sessions={sessionRows.map((r) => ({
        ...r.session,
        zoneName: r.zoneName,
        zoneColor: r.zoneColor,
      }))}
      zones={zoneRows}
    />
  );
}
