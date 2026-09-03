import { db } from "@/db";
import { items, movements, zones } from "@/db/schema";
import { and, asc, desc, eq, ilike, ne, or, sql } from "drizzle-orm";

export type ZoneWithCount = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  color: string;
  icon: string;
  photoId: number | null;
  itemCount: number;
  unitCount: number;
};

export async function getZonesWithCounts(): Promise<ZoneWithCount[]> {
  const rows = await db
    .select({
      id: zones.id,
      name: zones.name,
      slug: zones.slug,
      description: zones.description,
      color: zones.color,
      icon: zones.icon,
      photoId: zones.photoId,
      itemCount: sql<number>`count(${items.id})::int`,
      unitCount: sql<number>`coalesce(sum(${items.quantity}), 0)::int`,
    })
    .from(zones)
    .leftJoin(items, and(eq(items.zoneId, zones.id), ne(items.status, "BAJA")))
    .groupBy(zones.id)
    .orderBy(asc(zones.name));
  return rows;
}

export type ItemWithZone = typeof items.$inferSelect & {
  zoneName: string;
  zoneColor: string;
};

export async function getItems(filters: {
  zoneId?: number;
  type?: string;
  status?: string;
  search?: string;
}): Promise<ItemWithZone[]> {
  const conds = [];
  if (filters.zoneId) conds.push(eq(items.zoneId, filters.zoneId));
  if (filters.type) conds.push(eq(items.itemType, filters.type));
  if (filters.status) conds.push(eq(items.status, filters.status));
  else conds.push(ne(items.status, "BAJA"));
  if (filters.search) {
    const q = `%${filters.search}%`;
    conds.push(
      or(ilike(items.name, q), ilike(items.code, q), ilike(items.category, q))!,
    );
  }
  const rows = await db
    .select({
      item: items,
      zoneName: zones.name,
      zoneColor: zones.color,
    })
    .from(items)
    .innerJoin(zones, eq(items.zoneId, zones.id))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(asc(items.name));
  return rows.map((r) => ({ ...r.item, zoneName: r.zoneName, zoneColor: r.zoneColor }));
}

export async function getDashboardStats() {
  const [tot] = await db
    .select({
      totalItems: sql<number>`count(*)::int`,
      totalUnits: sql<number>`coalesce(sum(${items.quantity}), 0)::int`,
      lent: sql<number>`count(*) filter (where ${items.status} = 'PRESTADO')::int`,
      maintenance: sql<number>`count(*) filter (where ${items.status} = 'MANTENIMIENTO')::int`,
      totalValue: sql<string>`coalesce(sum(${items.estimatedValue}), 0)`,
    })
    .from(items)
    .where(ne(items.status, "BAJA"));

  const [zoneCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(zones);

  const lowStock = await db
    .select({
      item: items,
      zoneName: zones.name,
      zoneColor: zones.color,
    })
    .from(items)
    .innerJoin(zones, eq(items.zoneId, zones.id))
    .where(
      and(
        eq(items.itemType, "CONTABLE"),
        ne(items.status, "BAJA"),
        sql`${items.quantity} <= ${items.minQuantity}`,
        sql`${items.minQuantity} > 0`,
      ),
    )
    .orderBy(asc(items.quantity), asc(items.name))
    .limit(8);

  const recentMovements = await db
    .select({
      movement: movements,
      itemName: items.name,
      itemCode: items.code,
      zoneName: zones.name,
      zoneColor: zones.color,
    })
    .from(movements)
    .innerJoin(items, eq(movements.itemId, items.id))
    .innerJoin(zones, eq(items.zoneId, zones.id))
    .orderBy(desc(movements.createdAt))
    .limit(9);

  return {
    totalItems: tot.totalItems,
    totalUnits: tot.totalUnits,
    lent: tot.lent,
    maintenance: tot.maintenance,
    totalValue: Number(tot.totalValue),
    zoneCount: zoneCount.count,
    lowStock: lowStock.map((r) => ({
      ...r.item,
      zoneName: r.zoneName,
      zoneColor: r.zoneColor,
    })),
    recentMovements: recentMovements.map((r) => ({
      ...r.movement,
      itemName: r.itemName,
      itemCode: r.itemCode,
      zoneName: r.zoneName,
      zoneColor: r.zoneColor,
    })),
  };
}
