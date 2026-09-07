import { sql } from "drizzle-orm";
import {
  pgTable,
  pgSequence,
  serial,
  text,
  integer,
  numeric,
  timestamp,
  date,
  boolean,
  index,
  uniqueIndex,
  customType,
  check,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

/** Numeración pública permanente, independiente del ID interno y de la zona. */
export const inventoryCodeSequence = pgSequence("inventory_code_seq", {
  startWith: 1,
  increment: 1,
});

export const photos = pgTable("photos", {
  id: serial("id").primaryKey(),
  mimeType: text("mime_type").notNull(),
  // Fallback local/DB. Si storagePath existe, el binario vive en Supabase Storage.
  data: bytea("data"),
  thumbnailData: bytea("thumbnail_data"),
  storagePath: text("storage_path"),
  size: integer("size").notNull(),
  width: integer("width"),
  height: integer("height"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const zones = pgTable("zones", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  color: text("color").notNull().default("#A67C2D"),
  icon: text("icon").notNull().default("church"),
  photoId: integer("photo_id").references(() => photos.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Zona → armario → estante → caja (árbol arbitrario). */
export const storageLocations = pgTable(
  "storage_locations",
  {
    id: serial("id").primaryKey(),
    zoneId: integer("zone_id").notNull().references(() => zones.id, { onDelete: "cascade" }),
    parentId: integer("parent_id").references((): AnyPgColumn => storageLocations.id, {
      onDelete: "cascade",
    }),
    name: text("name").notNull(),
    kind: text("kind").notNull().default("OTRO"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("storage_locations_zone_idx").on(t.zoneId),
    uniqueIndex("storage_locations_parent_name_uidx").on(t.zoneId, t.parentId, t.name),
  ],
);

export const items = pgTable(
  "items",
  {
    id: serial("id").primaryKey(),
    inventoryNumber: integer("inventory_number").unique(),
    // Código permanente: PSB-000001. No cambia si se traslada de zona.
    code: text("code").notNull().unique(),
    externalBarcode: text("external_barcode"),
    name: text("name").notNull(),
    description: text("description"),
    category: text("category").notNull().default("General"),
    zoneId: integer("zone_id").notNull().references(() => zones.id),
    locationId: integer("location_id").references(() => storageLocations.id, {
      onDelete: "set null",
    }),
    // Lugar exacto en la propia ubicación (texto libre): "cajón de plata, fondo derecho"
    locationNote: text("location_note"),
    photoId: integer("photo_id").references(() => photos.id, { onDelete: "set null" }),
    itemType: text("item_type").notNull().default("UNICO"),
    quantity: integer("quantity").notNull().default(1),
    minQuantity: integer("min_quantity").notNull().default(0),
    status: text("status").notNull().default("DISPONIBLE"),
    condition: text("condition").notNull().default("BUENO"),
    acquisitionDate: date("acquisition_date"),
    estimatedValue: numeric("estimated_value", { precision: 12, scale: 2 }),
    notes: text("notes"),
    version: integer("version").notNull().default(1),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedReason: text("deleted_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("items_zone_idx").on(t.zoneId),
    index("items_code_idx").on(t.code),
    index("items_status_idx").on(t.status),
    index("items_deleted_idx").on(t.deletedAt),
    uniqueIndex("items_external_barcode_uidx").on(t.externalBarcode),
    check("items_quantity_non_negative", sql`${t.quantity} >= 0`),
    check("items_min_quantity_non_negative", sql`${t.minQuantity} >= 0`),
    check("items_version_positive", sql`${t.version} > 0`),
    check("items_type_valid", sql`${t.itemType} in ('UNICO','CONTABLE')`),
    check(
      "items_status_valid",
      sql`${t.status} in ('DISPONIBLE','PRESTADO','MANTENIMIENTO','BAJA')`,
    ),
    check(
      "items_condition_valid",
      sql`${t.condition} in ('EXCELENTE','BUENO','REGULAR','DETERIORADO')`,
    ),
    check(
      "items_unique_quantity_one",
      sql`${t.itemType} <> 'UNICO' or ${t.quantity} = 1`,
    ),
  ],
);

export const itemCodeAliases = pgTable(
  "item_code_aliases",
  {
    id: serial("id").primaryKey(),
    itemId: integer("item_id").notNull().references(() => items.id, { onDelete: "cascade" }),
    code: text("code").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("item_code_aliases_item_idx").on(t.itemId)],
);

export const itemPhotos = pgTable(
  "item_photos",
  {
    id: serial("id").primaryKey(),
    itemId: integer("item_id").notNull().references(() => items.id, { onDelete: "cascade" }),
    photoId: integer("photo_id").notNull().references(() => photos.id, { onDelete: "cascade" }),
    caption: text("caption"),
    isPrimary: boolean("is_primary").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("item_photos_item_idx").on(t.itemId),
    uniqueIndex("item_photos_item_photo_uidx").on(t.itemId, t.photoId),
  ],
);

export const movements = pgTable(
  "movements",
  {
    id: serial("id").primaryKey(),
    itemId: integer("item_id").notNull().references(() => items.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    quantity: integer("quantity").notNull().default(0),
    note: text("note"),
    actor: text("actor").notNull().default("Administrador"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("movements_item_idx").on(t.itemId)],
);

export const loans = pgTable(
  "loans",
  {
    id: serial("id").primaryKey(),
    itemId: integer("item_id").notNull().references(() => items.id, { onDelete: "cascade" }),
    borrower: text("borrower").notNull(),
    responsible: text("responsible"),
    quantity: integer("quantity").notNull().default(1),
    lentAt: timestamp("lent_at", { withTimezone: true }).notNull().defaultNow(),
    dueAt: timestamp("due_at", { withTimezone: true }),
    returnedAt: timestamp("returned_at", { withTimezone: true }),
    notes: text("notes"),
  },
  (t) => [
    index("loans_item_idx").on(t.itemId),
    check("loans_quantity_positive", sql`${t.quantity} > 0`),
  ],
);

export const maintenanceRecords = pgTable(
  "maintenance_records",
  {
    id: serial("id").primaryKey(),
    itemId: integer("item_id").notNull().references(() => items.id, { onDelete: "cascade" }),
    provider: text("provider"),
    description: text("description").notNull(),
    cost: numeric("cost", { precision: 12, scale: 2 }),
    startedAt: date("started_at").notNull(),
    completedAt: date("completed_at"),
    nextReviewAt: date("next_review_at"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("maintenance_item_idx").on(t.itemId)],
);

export const appUsers = pgTable("app_users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("LECTOR"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const appSettings = pgTable("app_settings", {
  id: integer("id").primaryKey().default(1),
  parishName: text("parish_name").notNull().default("Parroquia Santa Bárbara"),
  address: text("address"),
  inventoryPrefix: text("inventory_prefix").notNull().default("PSB"),
  labelFooter: text("label_footer"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const authLoginAttempts = pgTable("auth_login_attempts", {
  key: text("key").primaryKey(),
  failures: integer("failures").notNull().default(0),
  windowStartedAt: timestamp("window_started_at", { withTimezone: true }).notNull().defaultNow(),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const auditSessions = pgTable("audit_sessions", {
  id: serial("id").primaryKey(),
  zoneId: integer("zone_id").notNull().references(() => zones.id, { onDelete: "cascade" }),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  status: text("status").notNull().default("EN_CURSO"), // EN_CURSO | COMPLETADO | CANCELADO
  totalExpected: integer("total_expected").notNull().default(0),
  totalScanned: integer("total_scanned").notNull().default(0),
  totalDiscrepancies: integer("total_discrepancies").notNull().default(0),
  auditorName: text("auditor_name"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const auditSessionItems = pgTable(
  "audit_session_items",
  {
    id: serial("id").primaryKey(),
    auditSessionId: integer("audit_session_id").notNull().references(() => auditSessions.id, { onDelete: "cascade" }),
    itemId: integer("item_id").references(() => items.id, { onDelete: "set null" }),
    scannedCode: text("scanned_code").notNull(),
    expectedQuantity: integer("expected_quantity").notNull().default(0),
    scannedQuantity: integer("scanned_quantity").notNull().default(0),
    status: text("status").notNull().default("CORRECTO"), // CORRECTO | FALTANTE | SOBRANTE | DISCREPANCIA_CANTIDAD | FUERA_DE_ZONA | DESCONOCIDO
    scannedAt: timestamp("scanned_at", { withTimezone: true }).notNull().defaultNow(),
    notes: text("notes"),
  },
  (t) => [
    index("audit_session_items_session_idx").on(t.auditSessionId),
    index("audit_session_items_item_idx").on(t.itemId),
  ],
);

export const scanLogs = pgTable(
  "scan_logs",
  {
    id: serial("id").primaryKey(),
    code: text("code").notNull(),
    matchedItemId: integer("matched_item_id").references(() => items.id, { onDelete: "set null" }),
    matchedZoneId: integer("matched_zone_id").references(() => zones.id, { onDelete: "set null" }),
    action: text("action").notNull().default("CONSULTA"), // CONSULTA | AJUSTE | AUDITORIA
    actor: text("actor"),
    scannedAt: timestamp("scanned_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("scan_logs_code_idx").on(t.code),
    index("scan_logs_item_idx").on(t.matchedItemId),
    index("scan_logs_scanned_at_idx").on(t.scannedAt),
  ],
);

export type Zone = typeof zones.$inferSelect;
export type Item = typeof items.$inferSelect;
export type Movement = typeof movements.$inferSelect;
export type Photo = typeof photos.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type StorageLocation = typeof storageLocations.$inferSelect;
export type Loan = typeof loans.$inferSelect;
export type MaintenanceRecord = typeof maintenanceRecords.$inferSelect;
export type AppUser = typeof appUsers.$inferSelect;
export type AppSetting = typeof appSettings.$inferSelect;
export type AuthLoginAttempt = typeof authLoginAttempts.$inferSelect;
export type AuditSession = typeof auditSessions.$inferSelect;
export type AuditSessionItem = typeof auditSessionItems.$inferSelect;
export type ScanLog = typeof scanLogs.$inferSelect;
