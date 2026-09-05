CREATE SEQUENCE "public"."inventory_code_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE TABLE "app_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"parish_name" text DEFAULT 'Parroquia Santa Bárbara' NOT NULL,
	"address" text,
	"inventory_prefix" text DEFAULT 'PSB' NOT NULL,
	"label_footer" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"display_name" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'LECTOR' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "auth_login_attempts" (
	"key" text PRIMARY KEY NOT NULL,
	"failures" integer DEFAULT 0 NOT NULL,
	"window_started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_until" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "item_code_aliases" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_id" integer NOT NULL,
	"code" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "item_code_aliases_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "item_photos" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_id" integer NOT NULL,
	"photo_id" integer NOT NULL,
	"caption" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" serial PRIMARY KEY NOT NULL,
	"inventory_number" integer,
	"code" text NOT NULL,
	"external_barcode" text,
	"name" text NOT NULL,
	"description" text,
	"category" text DEFAULT 'General' NOT NULL,
	"zone_id" integer NOT NULL,
	"location_id" integer,
	"photo_id" integer,
	"item_type" text DEFAULT 'UNICO' NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"min_quantity" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'DISPONIBLE' NOT NULL,
	"condition" text DEFAULT 'BUENO' NOT NULL,
	"acquisition_date" date,
	"estimated_value" numeric(12, 2),
	"notes" text,
	"version" integer DEFAULT 1 NOT NULL,
	"deleted_at" timestamp with time zone,
	"deleted_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "items_inventory_number_unique" UNIQUE("inventory_number"),
	CONSTRAINT "items_code_unique" UNIQUE("code"),
	CONSTRAINT "items_quantity_non_negative" CHECK ("items"."quantity" >= 0),
	CONSTRAINT "items_min_quantity_non_negative" CHECK ("items"."min_quantity" >= 0),
	CONSTRAINT "items_version_positive" CHECK ("items"."version" > 0),
	CONSTRAINT "items_type_valid" CHECK ("items"."item_type" in ('UNICO','CONTABLE')),
	CONSTRAINT "items_status_valid" CHECK ("items"."status" in ('DISPONIBLE','PRESTADO','MANTENIMIENTO','BAJA')),
	CONSTRAINT "items_condition_valid" CHECK ("items"."condition" in ('EXCELENTE','BUENO','REGULAR','DETERIORADO')),
	CONSTRAINT "items_unique_quantity_one" CHECK ("items"."item_type" <> 'UNICO' or "items"."quantity" = 1)
);
--> statement-breakpoint
CREATE TABLE "loans" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_id" integer NOT NULL,
	"borrower" text NOT NULL,
	"responsible" text,
	"quantity" integer DEFAULT 1 NOT NULL,
	"lent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"due_at" timestamp with time zone,
	"returned_at" timestamp with time zone,
	"notes" text,
	CONSTRAINT "loans_quantity_positive" CHECK ("loans"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "maintenance_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_id" integer NOT NULL,
	"provider" text,
	"description" text NOT NULL,
	"cost" numeric(12, 2),
	"started_at" date NOT NULL,
	"completed_at" date,
	"next_review_at" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "movements" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_id" integer NOT NULL,
	"type" text NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"note" text,
	"actor" text DEFAULT 'Administrador' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "photos" (
	"id" serial PRIMARY KEY NOT NULL,
	"mime_type" text NOT NULL,
	"data" "bytea",
	"thumbnail_data" "bytea",
	"storage_path" text,
	"size" integer NOT NULL,
	"width" integer,
	"height" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "storage_locations" (
	"id" serial PRIMARY KEY NOT NULL,
	"zone_id" integer NOT NULL,
	"parent_id" integer,
	"name" text NOT NULL,
	"kind" text DEFAULT 'OTRO' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "zones" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"color" text DEFAULT '#A67C2D' NOT NULL,
	"icon" text DEFAULT 'church' NOT NULL,
	"photo_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "zones_name_unique" UNIQUE("name"),
	CONSTRAINT "zones_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "item_code_aliases" ADD CONSTRAINT "item_code_aliases_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_photos" ADD CONSTRAINT "item_photos_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_photos" ADD CONSTRAINT "item_photos_photo_id_photos_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."photos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_location_id_storage_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."storage_locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_photo_id_photos_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."photos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movements" ADD CONSTRAINT "movements_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storage_locations" ADD CONSTRAINT "storage_locations_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storage_locations" ADD CONSTRAINT "storage_locations_parent_id_storage_locations_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."storage_locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zones" ADD CONSTRAINT "zones_photo_id_photos_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."photos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "item_code_aliases_item_idx" ON "item_code_aliases" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "item_photos_item_idx" ON "item_photos" USING btree ("item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "item_photos_item_photo_uidx" ON "item_photos" USING btree ("item_id","photo_id");--> statement-breakpoint
CREATE INDEX "items_zone_idx" ON "items" USING btree ("zone_id");--> statement-breakpoint
CREATE INDEX "items_code_idx" ON "items" USING btree ("code");--> statement-breakpoint
CREATE INDEX "items_status_idx" ON "items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "items_deleted_idx" ON "items" USING btree ("deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "items_external_barcode_uidx" ON "items" USING btree ("external_barcode");--> statement-breakpoint
CREATE INDEX "loans_item_idx" ON "loans" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "maintenance_item_idx" ON "maintenance_records" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "movements_item_idx" ON "movements" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "storage_locations_zone_idx" ON "storage_locations" USING btree ("zone_id");--> statement-breakpoint
CREATE UNIQUE INDEX "storage_locations_parent_name_uidx" ON "storage_locations" USING btree ("zone_id","parent_id","name");