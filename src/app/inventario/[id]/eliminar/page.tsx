import { and, eq, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { items } from "@/db/schema";
import { authPageMetadata, requireAuthenticated } from "@/lib/auth";
import { ItemDeleteConfirm } from "@/components/item-delete-confirm";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return authPageMetadata("Enviar a la papelera");
}

export default async function EliminarArticuloPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuthenticated();
  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const [item] = await db
    .select({ id: items.id, code: items.code, name: items.name })
    .from(items)
    .where(and(eq(items.id, id), isNull(items.deletedAt)));
  if (!item) notFound();

  return <ItemDeleteConfirm id={item.id} code={item.code} name={item.name} />;
}
