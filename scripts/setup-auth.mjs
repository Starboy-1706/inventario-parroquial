/**
 * Migración segura de acceso por IP → acceso por clave.
 * No modifica zones, items, movements ni photos.
 * Uso: DATABASE_URL="postgresql://..." node scripts/setup-auth.mjs
 */
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("❌ Falta DATABASE_URL.");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: databaseUrl,
  ssl: /localhost|127\.0\.0\.1/.test(databaseUrl)
    ? undefined
    : { rejectUnauthorized: false },
  max: 1,
  connectionTimeoutMillis: 10_000,
});

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`
      CREATE TABLE IF NOT EXISTS auth_login_attempts (
        "key" text PRIMARY KEY,
        failures integer NOT NULL DEFAULT 0,
        window_started_at timestamptz NOT NULL DEFAULT now(),
        locked_until timestamptz,
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    // Las tablas antiguas solo contenían IPs e intentos, nunca inventario.
    await client.query("DROP TABLE IF EXISTS access_attempts;");
    await client.query("DROP TABLE IF EXISTS allowed_ips;");
    await client.query("COMMIT");
    console.log("✅ Seguridad por clave preparada correctamente.");
    console.log("✅ Zonas, artículos, movimientos y fotos permanecen intactos.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("❌ No se pudo preparar la autenticación:", error.message);
  process.exit(1);
});
