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

## Seguridad (lista blanca por IP)

- Tabla `allowed_ips` en PostgreSQL: solo los dispositivos cuya IP figura en
  ella pueden **ver siquiera** la aplicación. El resto recibe una página 404
  completamente en blanco — ni interfaz, ni JavaScript, ni metadatos, ni
  datos en el payload. Sin nada en el navegador, no hay nada que manipular
  desde la consola.
- El filtro se aplica **en el servidor**: layout + cada página
  (`requireAuthorizedIp`) + cada API (`apiIpGuard`, responde 404).
- **Arranque (bootstrap):** con la tabla vacía, la app es abierta. En cuanto
  autorizas la primera IP desde **/seguridad**, el bloqueo se activa.
- Soporta IP exacta (`83.45.12.9`) y rangos CIDR (`83.45.12.0/24`).
- Salvaguardas: no puedes borrar tu propia IP ni quedarte con la lista vacía.
- Cabeceras endurecidas: `X-Frame-Options: DENY`, `nosniff`,
  `Referrer-Policy` y `Permissions-Policy` (cámara solo dentro de la app).

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
cp .env.example .env        # configura DATABASE_URL
npx drizzle-kit push        # crea las tablas (zones, items, movements)
node scripts/seed.mjs       # datos de ejemplo (opcional)
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
   DATABASE_URL="postgresql://…" npx drizzle-kit push   # crea las tablas
   DATABASE_URL="postgresql://…" node scripts/seed.mjs  # datos iniciales
   ```

4. **Vercel:** _Add New → Project → Import_ desde GitHub → framework detectado
   automáticamente (Next.js) → añade la variable de entorno antes de desplegar:

   | Variable       | Valor                          | Ámbito    |
   | -------------- | ------------------------------ | --------- |
   | `DATABASE_URL` | cadena de conexión PostgreSQL  | Producción |

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
