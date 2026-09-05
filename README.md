# Sacristía Digital — Inventario Parroquial

Aplicación web fullstack para la **gestión del inventario parroquial dividido por
zonas**, con **códigos únicos escaneables (QR/barras)** por artículo y un
**módulo de lectura por cámara en tiempo real**, optimizado para móvil y PC.

## Funcionalidades

- **Gestión por zonas** — Alta, edición y filtrado por ubicaciones físicas
  (Sacristía, Despacho Parroquial, Salón Parroquial, Almacén, Coro…), cada una
  con color, icono y **fotografía** distintivos.
- **Fotografías de zonas y artículos** — Subida desde cámara o galería con
  **compresión automática en el navegador** (máx. 1600 px, JPEG). Las imágenes
  se guardan como `bytea` en **PostgreSQL** y se sirven por `/api/photos/[id]`
  con caché inmutable: persistencia total en la nube sin depender del sistema
  de archivos efímero de Vercel ni de servicios externos.
- **Códigos únicos escaneables** — Cada artículo recibe automáticamente un
  código del tipo `SAC-0001` (prefijo de zona + secuencia). La ficha incluye su
  **etiqueta QR imprimible**, que apunta al módulo de escáner.
- **Escáner por cámara en vivo** — Lector en tiempo real (QR, Code-128,
  Code-39, EAN-13/8, UPC, ITF, Codabar, DataMatrix) con selección de cámara,
  entrada manual alternativa y consulta instantánea de la ficha.
- **Control de existencias** — Distinción entre **piezas únicas** (cáliz
  histórico: control por _estado_ — en su lugar / prestado / mantenimiento) y
  **acumulables** (velas, hostias: control _numérico_ con entradas, salidas,
  recuento exacto y **alertas de stock mínimo**).
- **Panel de administración (CRUD)** — Altas, ediciones, bajas y eliminaciones
  de artículos y zonas directamente desde la web, con confirmaciones.
- **Libro mayor de movimientos** — Toda operación (alta, entrada, salida,
  ajuste, traslado, cambio de estado) queda registrada con fecha y nota, en
  **transacciones ACID**.

## Seguridad por clave

- Ventana previa en `/acceso`: una persona sin sesión no recibe páginas ni
  datos del inventario. `proxy.ts` la redirige antes del renderizado.
- Defensa en profundidad: además de Proxy, cada Server Component verifica la
  sesión antes de consultar PostgreSQL y cada API valida la cookie de sesión.
- La cookie es `HttpOnly`, `Secure` en producción y `SameSite=Strict`; contiene
  un token HMAC firmado con caducidad, nunca la clave de acceso.
- Cambiar `ACCESS_PASSWORD` invalida las sesiones existentes. Cambiar
  `SESSION_SECRET` revoca inmediatamente todos los dispositivos.
- Protección contra fuerza bruta en PostgreSQL: 5 fallos en 15 minutos
  bloquean temporalmente ese origen. El identificador almacenado es un HMAC
  irreversible, no una dirección IP legible ni una lista de autorización.
- Cabeceras endurecidas: CSP, `X-Frame-Options: DENY`, `nosniff`,
  `Cross-Origin-Opener-Policy`, `Referrer-Policy: no-referrer` y cámara solo
  dentro de la propia aplicación.

## Stack

| Capa             | Tecnología                                              |
| ---------------- | ------------------------------------------------------- |
| Framework        | **Next.js 16** (App Router, React 19, TypeScript)       |
| Base de datos    | **PostgreSQL** gestionado con **Drizzle ORM**           |
| Estilos          | Tailwind CSS 4 · Fraunces + Inter + JetBrains Mono      |
| Escáner          | `html5-qrcode` (getUserMedia, cámara en vivo)           |
| Fotografías      | Canvas API (compresión) + almacenamiento `bytea` en PG  |
| Etiquetas QR     | `qrcode.react` + impresión CSS                          |
| Animación        | Framer Motion                                           |

## Puesta en marcha local

```bash
npm install
cp .env.example .env              # configura las 3 variables
npx drizzle-kit push              # crea el esquema inicial
node scripts/setup-auth.mjs       # prepara la seguridad por clave
node scripts/seed.mjs             # datos de ejemplo (opcional)
npm run dev
```

## Despliegue en Vercel + PostgreSQL gestionado

> El repositorio incluye `.gitignore` que **excluye `.env`**: las credenciales
> locales nunca se suben a GitHub. En producción se configuran como variables
> de entorno de Vercel.

1. **Base de datos (Neon o Supabase):** crea un proyecto y copia la cadena de
   conexión `postgresql://…` (con SSL). Es inamovible: backups automáticos y
   transacciones ACID garantizadas por el proveedor.
2. **GitHub:** sube este repositorio (`git push`).
3. **Prepara la base remota una única vez** desde tu terminal. Gracias a
   `drizzle.config.ts`, la URL se toma de la variable de entorno del comando:

   ```bash
   DATABASE_URL="postgresql://…" node scripts/setup-auth.mjs  # migra IP → clave
   DATABASE_URL="postgresql://…" npx drizzle-kit push         # sincroniza tablas
   DATABASE_URL="postgresql://…" node scripts/seed.mjs        # opcional
   ```

4. **Vercel:** _Add New → Project → Import_ desde GitHub → framework detectado
   automáticamente (Next.js) → añade estas variables antes de desplegar:

   | Variable          | Valor                                      | Ámbito     |
   | ----------------- | ------------------------------------------ | ---------- |
   | `DATABASE_URL`    | cadena de conexión PostgreSQL              | Producción |
   | `ACCESS_PASSWORD` | frase privada de 10 caracteres o más       | Producción |
   | `SESSION_SECRET`  | salida de `openssl rand -base64 48`         | Producción |

5. Cada `git push` dispara un **despliegue continuo** automático. La lectura de
   cámara funciona en cuanto el sitio se sirve por HTTPS (Vercel lo proporciona
   por defecto y los navegadores lo exigen para `getUserMedia`).

## Estructura

```
src/
├── app/
│   ├── page.tsx                  # Panel general (stats, zonas, alertas, actividad)
│   ├── inventario/               # Listado filtrado + ficha con QR y stock
│   ├── zonas/                    # CRUD de zonas
│   ├── escaner/                  # Escáner por cámara + entrada manual
│   └── api/                      # REST: zones, items, scan, adjust (ACID)
├── components/                   # UI: formularios, QR, escáner, modales…
├── db/                           # Conexión (pg) + esquema Drizzle
└── lib/                          # Constantes, consultas y utilidades
scripts/seed.mjs                  # Semilla de datos
```
