import { pool } from "@/db";

let migrationPromise: Promise<void> | null = null;

const CATEGORIES = [
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

/**
 * Auto-migrador automático y transparente:
 * Se ejecuta al arrancar el servidor o en las consultas clave.
 * Garantiza que todas las columnas y tablas existan en Supabase/PostgreSQL
 * sin requerir que el usuario abra Supabase ni ejecute SQL manual.
 */
export async function ensureDbSchema(): Promise<void> {
  if (!migrationPromise) {
    migrationPromise = (async () => {
      const client = await pool.connect();
      try {
        await client.query(`
          CREATE SEQUENCE IF NOT EXISTS inventory_code_seq START 1;

          DO $$ BEGIN
            ALTER TABLE photos ALTER COLUMN data DROP NOT NULL;
          EXCEPTION WHEN others THEN NULL; END $$;

          ALTER TABLE photos ADD COLUMN IF NOT EXISTS thumbnail_data bytea;
          ALTER TABLE photos ADD COLUMN IF NOT EXISTS storage_path text;
          ALTER TABLE photos ADD COLUMN IF NOT EXISTS width integer;
          ALTER TABLE photos ADD COLUMN IF NOT EXISTS height integer;

          ALTER TABLE zones ADD COLUMN IF NOT EXISTS photo_id integer REFERENCES photos(id) ON DELETE SET NULL;
          ALTER TABLE zones ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

          CREATE TABLE IF NOT EXISTS categories (
            id serial PRIMARY KEY,
            name text NOT NULL UNIQUE,
            description text,
            active boolean NOT NULL DEFAULT true,
            sort_order integer NOT NULL DEFAULT 0,
            created_at timestamptz NOT NULL DEFAULT now()
          );

          CREATE TABLE IF NOT EXISTS storage_locations (
            id serial PRIMARY KEY,
            zone_id integer NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
            parent_id integer REFERENCES storage_locations(id) ON DELETE CASCADE,
            name text NOT NULL,
            kind text NOT NULL DEFAULT 'OTRO',
            created_at timestamptz NOT NULL DEFAULT now()
          );
          CREATE INDEX IF NOT EXISTS storage_locations_zone_idx ON storage_locations(zone_id);

          ALTER TABLE items ADD COLUMN IF NOT EXISTS inventory_number integer;
          ALTER TABLE items ADD COLUMN IF NOT EXISTS external_barcode text;
          ALTER TABLE items ADD COLUMN IF NOT EXISTS location_id integer REFERENCES storage_locations(id) ON DELETE SET NULL;
          ALTER TABLE items ADD COLUMN IF NOT EXISTS location_note text;
          ALTER TABLE items ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;
          ALTER TABLE items ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
          ALTER TABLE items ADD COLUMN IF NOT EXISTS deleted_reason text;
          CREATE INDEX IF NOT EXISTS items_deleted_idx ON items(deleted_at);

          CREATE TABLE IF NOT EXISTS item_code_aliases (
            id serial PRIMARY KEY,
            item_id integer NOT NULL REFERENCES items(id) ON DELETE CASCADE,
            code text NOT NULL UNIQUE,
            created_at timestamptz NOT NULL DEFAULT now()
          );
          CREATE INDEX IF NOT EXISTS item_code_aliases_item_idx ON item_code_aliases(item_id);

          CREATE TABLE IF NOT EXISTS item_photos (
            id serial PRIMARY KEY,
            item_id integer NOT NULL REFERENCES items(id) ON DELETE CASCADE,
            photo_id integer NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
            caption text,
            is_primary boolean NOT NULL DEFAULT false,
            sort_order integer NOT NULL DEFAULT 0,
            created_at timestamptz NOT NULL DEFAULT now(),
            UNIQUE(item_id, photo_id)
          );
          CREATE INDEX IF NOT EXISTS item_photos_item_idx ON item_photos(item_id);

          DO $$ BEGIN
            ALTER TABLE movements ADD COLUMN IF NOT EXISTS actor text NOT NULL DEFAULT 'Administrador';
          EXCEPTION WHEN others THEN NULL; END $$;

          CREATE TABLE IF NOT EXISTS loans (
            id serial PRIMARY KEY,
            item_id integer NOT NULL REFERENCES items(id) ON DELETE CASCADE,
            borrower text NOT NULL,
            responsible text,
            quantity integer NOT NULL DEFAULT 1,
            lent_at timestamptz NOT NULL DEFAULT now(),
            due_at timestamptz,
            returned_at timestamptz,
            notes text
          );
          CREATE INDEX IF NOT EXISTS loans_item_idx ON loans(item_id);

          CREATE TABLE IF NOT EXISTS maintenance_records (
            id serial PRIMARY KEY,
            item_id integer NOT NULL REFERENCES items(id) ON DELETE CASCADE,
            provider text,
            description text NOT NULL,
            cost numeric(12,2),
            started_at date NOT NULL,
            completed_at date,
            next_review_at date,
            notes text,
            created_at timestamptz NOT NULL DEFAULT now()
          );
          CREATE INDEX IF NOT EXISTS maintenance_item_idx ON maintenance_records(item_id);

          CREATE TABLE IF NOT EXISTS app_settings (
            id integer PRIMARY KEY DEFAULT 1,
            parish_name text NOT NULL DEFAULT 'Parroquia Santa Bárbara',
            address text,
            inventory_prefix text NOT NULL DEFAULT 'PSB',
            label_footer text,
            updated_at timestamptz NOT NULL DEFAULT now()
          );
          INSERT INTO app_settings(id) VALUES (1) ON CONFLICT (id) DO NOTHING;

          CREATE TABLE IF NOT EXISTS auth_login_attempts (
            key text PRIMARY KEY,
            failures integer NOT NULL DEFAULT 0,
            window_started_at timestamptz NOT NULL DEFAULT now(),
            locked_until timestamptz,
            updated_at timestamptz NOT NULL DEFAULT now()
          );

          CREATE TABLE IF NOT EXISTS audit_sessions (
            id serial PRIMARY KEY,
            zone_id integer NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
            started_at timestamptz NOT NULL DEFAULT now(),
            completed_at timestamptz,
            status text NOT NULL DEFAULT 'EN_CURSO',
            total_expected integer NOT NULL DEFAULT 0,
            total_scanned integer NOT NULL DEFAULT 0,
            total_discrepancies integer NOT NULL DEFAULT 0,
            auditor_name text,
            notes text,
            created_at timestamptz NOT NULL DEFAULT now()
          );

          CREATE TABLE IF NOT EXISTS audit_session_items (
            id serial PRIMARY KEY,
            audit_session_id integer NOT NULL REFERENCES audit_sessions(id) ON DELETE CASCADE,
            item_id integer REFERENCES items(id) ON DELETE SET NULL,
            scanned_code text NOT NULL,
            expected_quantity integer NOT NULL DEFAULT 0,
            scanned_quantity integer NOT NULL DEFAULT 0,
            status text NOT NULL DEFAULT 'CORRECTO',
            scanned_at timestamptz NOT NULL DEFAULT now(),
            notes text
          );
          CREATE INDEX IF NOT EXISTS audit_session_items_session_idx ON audit_session_items(audit_session_id);
          CREATE INDEX IF NOT EXISTS audit_session_items_item_idx ON audit_session_items(item_id);

          CREATE TABLE IF NOT EXISTS scan_logs (
            id serial PRIMARY KEY,
            code text NOT NULL,
            matched_item_id integer REFERENCES items(id) ON DELETE SET NULL,
            matched_zone_id integer REFERENCES zones(id) ON DELETE SET NULL,
            action text NOT NULL DEFAULT 'CONSULTA',
            actor text,
            scanned_at timestamptz NOT NULL DEFAULT now()
          );
          CREATE INDEX IF NOT EXISTS scan_logs_code_idx ON scan_logs(code);
          CREATE INDEX IF NOT EXISTS scan_logs_item_idx ON scan_logs(matched_item_id);
          CREATE INDEX IF NOT EXISTS scan_logs_scanned_at_idx ON scan_logs(scanned_at);

          DO $$ BEGIN
            SELECT setval(
              'inventory_code_seq',
              GREATEST(COALESCE((SELECT max(inventory_number) FROM items), 0),
                       COALESCE((SELECT max(id) FROM items), 0), 1), true
            );
            UPDATE items SET inventory_number = nextval('inventory_code_seq')
              WHERE inventory_number IS NULL;
          EXCEPTION WHEN others THEN NULL; END $$;
        `);

        for (const [i, name] of CATEGORIES.entries()) {
          await client.query(
            "INSERT INTO categories(name, sort_order) VALUES($1, $2) ON CONFLICT (name) DO NOTHING",
            [name, i],
          );
        }
      } catch (err) {
        console.error("[db/auto-migrate] Error en migración automática:", err);
      } finally {
        client.release();
      }
    })();
  }

  return migrationPromise;
}
