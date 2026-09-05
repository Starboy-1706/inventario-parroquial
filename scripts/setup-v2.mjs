import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("Falta DATABASE_URL");
const pool = new pg.Pool({
  connectionString: url,
  ssl: /localhost|127\.0\.0\.1/.test(url) ? undefined : { rejectUnauthorized: false },
  max: 1,
});

const categoryNames = [
  "Orfebrería y vasos sagrados",
  "Ornamentos y vestuario",
  "Mobiliario",
  "Material litúrgico",
  "Consumibles",
  "Limpieza y mantenimiento",
  "Tecnología y sonido",
  "Documentación y archivo",
  "Cocina y despensa",
  "Otros",
];

async function main() {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    await c.query(`
      CREATE SEQUENCE IF NOT EXISTS inventory_code_seq START 1;
      ALTER TABLE photos ALTER COLUMN data DROP NOT NULL;
      ALTER TABLE photos ADD COLUMN IF NOT EXISTS thumbnail_data bytea;
      ALTER TABLE photos ADD COLUMN IF NOT EXISTS storage_path text;
      ALTER TABLE photos ADD COLUMN IF NOT EXISTS width integer;
      ALTER TABLE photos ADD COLUMN IF NOT EXISTS height integer;
      ALTER TABLE zones ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

      CREATE TABLE IF NOT EXISTS categories (
        id serial PRIMARY KEY, name text NOT NULL UNIQUE, description text,
        active boolean NOT NULL DEFAULT true, sort_order integer NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS storage_locations (
        id serial PRIMARY KEY, zone_id integer NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
        parent_id integer REFERENCES storage_locations(id) ON DELETE CASCADE,
        name text NOT NULL, kind text NOT NULL DEFAULT 'OTRO',
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS storage_locations_zone_idx ON storage_locations(zone_id);
      CREATE UNIQUE INDEX IF NOT EXISTS storage_locations_parent_name_uidx
        ON storage_locations(zone_id, parent_id, name);

      ALTER TABLE items ADD COLUMN IF NOT EXISTS inventory_number integer;
      ALTER TABLE items ADD COLUMN IF NOT EXISTS external_barcode text;
      ALTER TABLE items ADD COLUMN IF NOT EXISTS location_id integer REFERENCES storage_locations(id) ON DELETE SET NULL;
      ALTER TABLE items ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;
      ALTER TABLE items ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
      ALTER TABLE items ADD COLUMN IF NOT EXISTS deleted_reason text;
      CREATE UNIQUE INDEX IF NOT EXISTS items_inventory_number_uidx ON items(inventory_number);
      CREATE UNIQUE INDEX IF NOT EXISTS items_external_barcode_uidx ON items(external_barcode) WHERE external_barcode IS NOT NULL;
      CREATE INDEX IF NOT EXISTS items_deleted_idx ON items(deleted_at);

      CREATE TABLE IF NOT EXISTS item_code_aliases (
        id serial PRIMARY KEY, item_id integer NOT NULL REFERENCES items(id) ON DELETE CASCADE,
        code text NOT NULL UNIQUE, created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS item_code_aliases_item_idx ON item_code_aliases(item_id);
      CREATE TABLE IF NOT EXISTS item_photos (
        id serial PRIMARY KEY, item_id integer NOT NULL REFERENCES items(id) ON DELETE CASCADE,
        photo_id integer NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
        caption text, is_primary boolean NOT NULL DEFAULT false,
        sort_order integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(item_id, photo_id)
      );
      CREATE INDEX IF NOT EXISTS item_photos_item_idx ON item_photos(item_id);

      ALTER TABLE movements ADD COLUMN IF NOT EXISTS actor text NOT NULL DEFAULT 'Administrador';
      CREATE TABLE IF NOT EXISTS loans (
        id serial PRIMARY KEY, item_id integer NOT NULL REFERENCES items(id) ON DELETE CASCADE,
        borrower text NOT NULL, responsible text, quantity integer NOT NULL DEFAULT 1,
        lent_at timestamptz NOT NULL DEFAULT now(), due_at timestamptz,
        returned_at timestamptz, notes text, CHECK(quantity > 0)
      );
      CREATE INDEX IF NOT EXISTS loans_item_idx ON loans(item_id);
      CREATE TABLE IF NOT EXISTS maintenance_records (
        id serial PRIMARY KEY, item_id integer NOT NULL REFERENCES items(id) ON DELETE CASCADE,
        provider text, description text NOT NULL, cost numeric(12,2),
        started_at date NOT NULL, completed_at date, next_review_at date,
        notes text, created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS maintenance_item_idx ON maintenance_records(item_id);

      CREATE TABLE IF NOT EXISTS app_users (
        id serial PRIMARY KEY, username text NOT NULL UNIQUE, display_name text NOT NULL,
        password_hash text NOT NULL, role text NOT NULL DEFAULT 'LECTOR',
        active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS app_settings (
        id integer PRIMARY KEY DEFAULT 1, parish_name text NOT NULL DEFAULT 'Parroquia Santa Bárbara',
        address text, inventory_prefix text NOT NULL DEFAULT 'PSB', label_footer text,
        updated_at timestamptz NOT NULL DEFAULT now()
      );
      INSERT INTO app_settings(id) VALUES (1) ON CONFLICT (id) DO NOTHING;

      CREATE TABLE IF NOT EXISTS auth_login_attempts (
        key text PRIMARY KEY, failures integer NOT NULL DEFAULT 0,
        window_started_at timestamptz NOT NULL DEFAULT now(), locked_until timestamptz,
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    for (const [i, name] of categoryNames.entries()) {
      await c.query(
        "INSERT INTO categories(name, sort_order) VALUES($1,$2) ON CONFLICT(name) DO NOTHING",
        [name, i],
      );
    }

    // Numeración y compatibilidad con QR antiguos.
    await c.query(`
      SELECT setval(
        'inventory_code_seq',
        GREATEST(COALESCE((SELECT max(inventory_number) FROM items), 0),
                 COALESCE((SELECT max(id) FROM items), 0), 1), true
      );
      UPDATE items SET inventory_number = nextval('inventory_code_seq')
        WHERE inventory_number IS NULL;
      INSERT INTO item_code_aliases(item_id, code)
        SELECT id, code FROM items WHERE code !~ '^PSB-[0-9]{6}$'
        ON CONFLICT(code) DO NOTHING;
      UPDATE items SET code = 'PSB-' || lpad(inventory_number::text, 6, '0')
        WHERE code !~ '^PSB-[0-9]{6}$';
      SELECT setval('inventory_code_seq',
        GREATEST(COALESCE((SELECT max(inventory_number) FROM items), 1), 1), true);
      INSERT INTO item_photos(item_id, photo_id, is_primary)
        SELECT id, photo_id, true FROM items WHERE photo_id IS NOT NULL
        ON CONFLICT(item_id, photo_id) DO NOTHING;
    `);

    // Constraints idempotentes.
    await c.query(`
      DO $$ BEGIN
        ALTER TABLE items ADD CONSTRAINT items_quantity_non_negative CHECK(quantity >= 0);
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN
        ALTER TABLE items ADD CONSTRAINT items_min_quantity_non_negative CHECK(min_quantity >= 0);
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN
        ALTER TABLE items ADD CONSTRAINT items_version_positive CHECK(version > 0);
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN
        ALTER TABLE items ADD CONSTRAINT items_type_valid CHECK(item_type IN ('UNICO','CONTABLE'));
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN
        ALTER TABLE items ADD CONSTRAINT items_status_valid CHECK(status IN ('DISPONIBLE','PRESTADO','MANTENIMIENTO','BAJA'));
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN
        ALTER TABLE items ADD CONSTRAINT items_condition_valid CHECK(condition IN ('EXCELENTE','BUENO','REGULAR','DETERIORADO'));
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN
        ALTER TABLE items ADD CONSTRAINT items_unique_quantity_one CHECK(item_type <> 'UNICO' OR quantity = 1);
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    // Búsqueda rápida y tolerante a tildes/errores si el proveedor permite extensiones.
    try {
      await c.query(`
        CREATE EXTENSION IF NOT EXISTS pg_trgm;
        CREATE INDEX IF NOT EXISTS items_name_trgm_idx ON items USING gin (name gin_trgm_ops);
        CREATE INDEX IF NOT EXISTS items_code_trgm_idx ON items USING gin (code gin_trgm_ops);
      `);
    } catch (error) {
      console.warn("Aviso: pg_trgm no disponible; se continúa sin búsqueda difusa.");
    }

    await c.query("COMMIT");
    console.log("✅ Migración V2 completada sin perder datos.");
    console.log("✅ Códigos PSB, papelera, auditoría, galerías, préstamos y mantenimiento listos.");
  } catch (error) {
    await c.query("ROLLBACK");
    throw error;
  } finally {
    c.release();
    await pool.end();
  }
}
main().catch((e) => { console.error("❌", e.message); process.exit(1); });
