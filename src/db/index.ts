import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is required. Configúrala en Vercel → Settings → Environment Variables.",
  );
}

/* Conexión robusta para producción:
 * - Postgres gestionado (Supabase/Neon) exige SSL.
 * - En local (localhost/127.0.0.1) se conecta sin SSL.
 * - Pool pequeño + timeouts cortos: estable en serverless con el
 *   Session Pooler de Supabase.
 */
const isLocalhost = /localhost|127\.0\.0\.1/.test(databaseUrl);

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool({
    connectionString: databaseUrl,
    ssl: isLocalhost ? undefined : { rejectUnauthorized: false },
    max: 3,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 10_000,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = drizzle(pool);
