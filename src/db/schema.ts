import {
  pgTable,
  serial,
  text,
  integer,
  numeric,
  timestamp,
  date,
  index,
  customType,
} from "drizzle-orm/pg-core";

/** Columna binaria PostgreSQL para almacenar fotografías en la propia base. */
const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

/**
 * Inventario Parroquial — modelo de datos
 *
 * photos     → Fotografías comprimidas (JPEG/WebP) servidas vía /api/photos/[id].
 *              Vivir en la base garantiza persistencia total en la nube.
 * zones      → Ubicaciones físicas de la parroquia (Sacristía, Despacho…)
 * items      → Artículos inventariados. Cada uno tiene un código único
 *              escaneable (QR / código de barras).
 * movements  → Libro mayor de movimientos (altas, entradas, salidas,
 *              ajustes, traslados y cambios de estado) para trazabilidad.
 */

export const photos = pgTable("photos", {
  id: serial("id").primaryKey(),
  mimeType: text("mime_type").notNull(),
  data: bytea("data").notNull(),
  size: integer("size").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const zones = pgTable("zones", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  color: text("color").notNull().default("#A67C2D"),
  icon: text("icon").notNull().default("church"),
  photoId: integer("photo_id").references(() => photos.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const items = pgTable(
  "items",
  {
    id: serial("id").primaryKey(),
    // Código único escaneable, ej. "SAC-0007" (prefijo de zona + secuencia)
    code: text("code").notNull().unique(),
    name: text("name").notNull(),
    description: text("description"),
    category: text("category").notNull().default("General"),
    zoneId: integer("zone_id")
      .notNull()
      .references(() => zones.id),
    photoId: integer("photo_id").references(() => photos.id, {
      onDelete: "set null",
    }),
    // UNICO → pieza única (cáliz, casulla histórica). Cantidad fija = 1.
    // CONTABLE → acumulable (velas, hostias…), con control numérico.
    itemType: text("item_type").notNull().default("UNICO"),
    quantity: integer("quantity").notNull().default(1),
    // Umbral de alerta de stock bajo (solo relevante para CONTABLE)
    minQuantity: integer("min_quantity").notNull().default(0),
    // DISPONIBLE | PRESTADO | MANTENIMIENTO | BAJA
    status: text("status").notNull().default("DISPONIBLE"),
    // EXCELENTE | BUENO | REGULAR | DETERIORADO
    condition: text("condition").notNull().default("BUENO"),
    acquisitionDate: date("acquisition_date"),
    estimatedValue: numeric("estimated_value", { precision: 12, scale: 2 }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("items_zone_idx").on(t.zoneId),
    index("items_code_idx").on(t.code),
    index("items_status_idx").on(t.status),
  ],
);

export const movements = pgTable(
  "movements",
  {
    id: serial("id").primaryKey(),
    itemId: integer("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    // ALTA | ENTRADA | SALIDA | AJUSTE | TRASLADO | ESTADO | BAJA
    type: text("type").notNull(),
    quantity: integer("quantity").notNull().default(0),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("movements_item_idx").on(t.itemId)],
);

export type Zone = typeof zones.$inferSelect;
export type Item = typeof items.$inferSelect;
export type Movement = typeof movements.$inferSelect;
export type Photo = typeof photos.$inferSelect;
