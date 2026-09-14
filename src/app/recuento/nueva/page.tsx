import { asc } from "drizzle-orm";
import { db } from "@/db";
import { zones } from "@/db/schema";
import { authPageMetadata, requireAuthenticated } from "@/lib/auth";
import { AuditStartForm } from "@/components/audit-start-form";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return authPageMetadata("Nuevo recuento");
}

export default async function NuevoRecuentoPage() {
  await requireAuthenticated();
  const zoneRows = await db.select().from(zones).orderBy(asc(zones.name));
  return <AuditStartForm zones={zoneRows} />;
}
