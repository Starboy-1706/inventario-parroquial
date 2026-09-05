import { db } from "@/db";
import { appSettings, items, movements, zones } from "@/db/schema";
import {
  and,
  asc,
  desc,
  eq,
  ilike,
  isNotNull,
  isNull,
  ne,
  or,
  sql,
} from "drizzle-orm";

export type ZoneWithCount = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  color: string;
  icon: string;
  photoId: number | null;
  itemCount: number;
  trashCount: number;
  totalCount: number;
  unitCount: number;
};

export async function getZonesWithCounts(): Promise<ZoneWithCount[]> {
  return db
    .select({
      id: zones.id,
      name: zones.name,
      slug: zones.slug,
      description: zones.description,
      color: zones.color,
      icon: zones.icon,
      photoId: zones.photoId,
      itemCount: sql<number>`count(${items.id}) filter (where ${items.deletedAt} is null)::int`,
      trashCount: sql<number>`count(${items.id}) filter (where ${items.deletedAt} is not null)::int`,
      totalCount: sql<number>`count(${items.id})::int`,
      unitCount: sql<number>`coalesce(sum(${items.quantity}) filter (where ${items.deletedAt} is null and ${items.status} <> 'BAJA'), 0)::int`,
    })
    .from(zones)
    .leftJoin(items, eq(items.zoneId, zones.id))
    .groupBy(zones.id)
    .orderBy(asc(zones.name));
}

export type ItemWithZone = typeof items.$inferSelect & {
  zoneName: string;
  zoneColor: string;
};

type ItemFilters = {
  zoneId?: number;
  type?: string;
  status?: string;
  search?: string;
  deleted?: boolean;
  page?: number;
  pageSize?: number;
};

function buildItemConditions(filters: ItemFilters) {
  const conds = [filters.deleted ? isNotNull(items.deletedAt) : isNull(items.deletedAt)];
  if (filters.zoneId) conds.push(eq(items.zoneId, filters.zoneId));
  if (filters.type) conds.push(eq(items.itemType, filters.type));
  if (filters.status) conds.push(eq(items.status, filters.status));
  else if (!filters.deleted) conds.push(ne(items.status, "BAJA"));
  if (filters.search?.trim()) {
    const q = `%${filters.search.trim()}%`;
    conds.push(
      or(
        ilike(items.name, q),
        ilike(items.code, q),
        ilike(items.category, q),
        ilike(items.externalBarcode, q),
        sql`exists (select 1 from item_code_aliases a where a.item_id = ${items.id} and a.code ilike ${q})`,
      )!,
    );
  }
  return and(...conds);
}

export async function getItemsPage(filters: ItemFilters) {
  const pageSize = Math.min(100, Math.max(10, filters.pageSize ?? 25));
  const where = buildItemConditions(filters);
  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(items)
    .where(where);
  const total = countRow.count;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(totalPages, Math.max(1, filters.page ?? 1));

  const rows = await db
    .select({ item: items, zoneName: zones.name, zoneColor: zones.color })
    .from(items)
    .innerJoin(zones, eq(items.zoneId, zones.id))
    .where(where)
    .orderBy(asc(items.name), asc(items.id))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return {
    data: rows.map((r) => ({
      ...r.item,
      zoneName: r.zoneName,
      zoneColor: r.zoneColor,
    })),
    total,
    page,
    pageSize,
    totalPages,
  };
}

export async function getItems(filters: ItemFilters): Promise<ItemWithZone[]> {
  const result = await getItemsPage({ ...filters, page: 1, pageSize: 100 });
  return result.data;
}

export async function getParishSettings() {
  const [settings] = await db.select().from(appSettings).where(eq(appSettings.id, 1));
  return (
    settings ?? {
      id: 1,
      parishName: "Parroquia Santa Bárbara",
      address: null,
      inventoryPrefix: "PSB",
      labelFooter: null,
      updatedAt: new Date(),
    }
  );
}

export async function getDashboardStats() {
  const active = and(isNull(items.deletedAt), ne(items.status, "BAJA"));
  const [tot] = await db
    .select({
      totalItems: sql<number>`count(*)::int`,
      totalUnits: sql<number>`coalesce(sum(${items.quantity}), 0)::int`,
      lent: sql<number>`count(*) filter (where ${items.status} = 'PRESTADO')::int`,
      maintenance: sql<number>`count(*) filter (where ${items.status} = 'MANTENIMIENTO')::int`,
      totalValue: sql<string>`coalesce(sum(${items.estimatedValue}), 0)`,
    })
    .from(items)
    .where(active);

  const [zoneCount] = await db.select({ count: sql<number>`count(*)::int` }).from(zones);

  const lowStock = await db
    .select({ item: items, zoneName: zones.name, zoneColor: zones.color })
    .from(items)
    .innerJoin(zones, eq(items.zoneId, zones.id))
    .where(
      and(
        active,
        eq(items.itemType, "CONTABLE"),
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
    .where(isNull(items.deletedAt))
    .orderBy(desc(movements.createdAt))
    .limit(9);

  return {
    totalItems: tot.totalItems,
    totalUnits: tot.totalUnits,
    lent: tot.lent,
    maintenance: tot.maintenance,
    totalValue: Number(tot.totalValue),
    zoneCount: zoneCount.count,
    lowStock: lowStock.map((r) => ({ ...r.item, zoneName: r.zoneName, zoneColor: r.zoneColor })),
    recentMovements: recentMovements.map((r) => ({
      ...r.movement,
      itemName: r.itemName,
      itemCode: r.itemCode,
      zoneName: r.zoneName,
      zoneColor: r.zoneColor,
    })),
  };
}
