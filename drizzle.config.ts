import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Prioridad: 1) variable de entorno ya exportada (p. ej. la cadena de Neon),
//            2) .env.local, 3) .env (desarrollo local).
config({ path: ".env" });
config({ path: ".env.local", override: true });

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      "postgresql://postgres:postgres@127.0.0.1:5432/app_db",
  },
});
