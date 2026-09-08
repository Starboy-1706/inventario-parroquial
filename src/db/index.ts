import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type PoolClient } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is required. Configúrala en Vercel → Settings → Environment Variables.",
  );
}

const isLocalhost = /localhost|127\.0\.0\.1/.test(databaseUrl);

const globalForDb = globalThis as typeof globalThis & {
  __parishDbPool?: Pool;
};

function createPool(): Pool {
  const p = new Pool({
    connectionString: databaseUrl,
    ssl: isLocalhost ? undefined : { rejectUnauthorized: false },
    max: 5,
    // Cerrar conexiones inactivas rápidamente para no mantener sockets muertos
    // cuando Supabase o el balanceador de Vercel corte la conexión por inactividad
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 8_000,
    // Permite que las funciones serverless se congelen limpiamente sin conexiones colgadas
    allowExitOnIdle: true,
  });

  // OBLIGATORIO para serverless: Capturar errores de sockets desconectados en reposo
  // Sin este listener, un corte de socket inactivo por Supabase lanza un error no capturado
  p.on("error", (err) => {
    console.warn("[db:pool] Conexión inactiva cerrada por el servidor remoto (recuperación automática):", err.message);
  });

  return p;
}

export const pool = globalForDb.__parishDbPool ?? createPool();

if (process.env.NODE_ENV !== "production") {
  globalForDb.__parishDbPool = pool;
}

export const db = drizzle(pool);

/**
 * Ejecuta una consulta con reintento automático en caso de corte de conexión transitorio
 * (muy común cuando una función serverless se despierta tras unos minutos de inactividad).
 */
export async function withDbRetry<T>(fn: (client: PoolClient) => Promise<T>, maxRetries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let client: PoolClient | null = null;
    try {
      client = await pool.connect();
      return await fn(client);
    } catch (err: unknown) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      const isTransient =
        /ECONNRESET|ETIMEDOUT|Connection terminated|timeout|closed|deadlock|57P01/i.test(msg);
      if (attempt < maxRetries && isTransient) {
        console.warn(`[db:retry] Reintentando conexión tras error transitorio (intento ${attempt + 1}/${maxRetries}):`, msg);
        await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
        continue;
      }
      throw err;
    } finally {
      if (client) {
        try {
          client.release();
        } catch {
          /* silent */
        }
      }
    }
  }
  throw lastError;
}
