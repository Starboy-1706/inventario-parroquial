import { db } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

import { ensureDbSchema } from "@/db/auto-migrate";

export async function GET() {
  try {
    await ensureDbSchema();
    await db.execute(sql`select 1`);
    return Response.json({ ok: true, schemaReady: true });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}
