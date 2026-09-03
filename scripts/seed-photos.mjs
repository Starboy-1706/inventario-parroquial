/**
 * Adjunta fotografías de ejemplo (public/samples/*) a registros existentes.
 * Uso: node scripts/seed-photos.mjs
 * Es idempotente: solo asigna foto a quien no tiene.
 */
import fs from "node:fs/promises";
import pg from "pg";

const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL ??
    "postgresql://postgres:postgres@127.0.0.1:5432/app_db",
});

const ATTACH = [
  { file: "public/samples/sacristia.jpg", table: "zones", where: "slug = 'sacristia'" },
  { file: "public/samples/caliz.jpg", table: "items", where: "code = 'SAC-0001'" },
  { file: "public/samples/sacristia.jpg", table: "items", where: "code = 'SAC-0002'" },
];

async function main() {
  const client = await pool.connect();
  try {
    for (const a of ATTACH) {
      const buf = await fs.readFile(a.file);
      const { rows } = await client.query(
        `INSERT INTO photos (mime_type, data, size) VALUES ('image/jpeg', $1, $2) RETURNING id`,
        [buf, buf.length],
      );
      const id = rows[0].id;
      const res = await client.query(
        `UPDATE ${a.table} SET photo_id = $1 WHERE ${a.where} AND photo_id IS NULL`,
        [id],
      );
      console.log(`${a.file} → ${a.table} (${a.where}): foto #${id} ${res.rowCount ? "asignada" : "(ya tenía foto)"}`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
