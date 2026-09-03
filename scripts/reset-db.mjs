/**
 * Vacía TODOS los datos de la base de datos (movimientos, artículos, zonas)
 * pero mantiene intacta la estructura de las tablas (esquema ACID).
 * Uso: node scripts/reset-db.mjs
 */
import pg from "pg";

const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL ??
    "postgresql://postgres:postgres@127.0.0.1:5432/app_db",
});

async function main() {
  const client = await pool.connect();
  try {
    console.log("Vaciando base de datos...");
    await client.query("BEGIN");

    // TRUNCATE con CASCADE borra todo y reinicia los contadores de ID (SAC-0001, etc.)
    await client.query(`
      TRUNCATE TABLE
        movements,
        items,
        zones,
        photos
      RESTART IDENTITY
      CASCADE;
    `);

    await client.query("COMMIT");
    console.log("✅ Base de datos vaciada con éxito y contadores reiniciados.");
    console.log("ℹ️ Al dar de alta el primer artículo nuevo, su código volverá a empezar por 0001.");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error("❌ Error al vaciar la base:", e.message);
  process.exit(1);
});
