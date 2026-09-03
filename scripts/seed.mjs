/**
 * Semilla de la base de datos — Inventario Parroquial
 * Uso: node scripts/seed.mjs
 * Es idempotente: no duplica si ya existen zonas.
 */
import pg from "pg";

const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL ??
    "postgresql://postgres:postgres@127.0.0.1:5432/app_db",
});

const slugify = (v) =>
  v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const prefix = (name) => {
  const clean = slugify(name).replace(/-/g, "").toUpperCase();
  return (clean.slice(0, 3) || "INV").padEnd(3, "X");
};

const ZONES = [
  {
    name: "Sacristía",
    description: "Vasos sagrados, ornamentos y objetos de culto",
    color: "#A67C2D",
    icon: "church",
  },
  {
    name: "Presbiterio y Altar",
    description: "Enseres del altar mayor y el presbiterio",
    color: "#2E4B3A",
    icon: "lamp",
  },
  {
    name: "Despacho Parroquial",
    description: "Archivo, documentación y material de oficina",
    color: "#3E5C76",
    icon: "archive",
  },
  {
    name: "Salón Parroquial",
    description: "Mobiliario y equipamiento para catequesis y reuniones",
    color: "#B0653A",
    icon: "users",
  },
  {
    name: "Almacén",
    description: "Consumibles, limpieza y reservas",
    color: "#8A6D3B",
    icon: "warehouse",
  },
  {
    name: "Coro",
    description: "Instrumentos y material musical",
    color: "#6B4E9B",
    icon: "music",
  },
];

// [nombre, zona, tipo, cantidad, mínimo, estado, conservación, categoría, valor, descripción]
const ITEMS = [
  ["Cáliz de plata dorada (s. XIX)", "Sacristía", "UNICO", 1, 0, "DISPONIBLE", "EXCELENTE", "Orfebrería y vasos sagrados", 1800, "Cáliz historiado con base lobulada y nudo con esmaltes. Donación de la familia Herrero, 1892."],
  ["Custodia barroca de altar", "Sacristía", "UNICO", 1, 0, "DISPONIBLE", "BUENO", "Orfebrería y vasos sagrados", 2400, "Custodia de sol rayado en plata sobredorada. Requiere restauración leve en los rayos inferiores."],
  ["Copón de plata con tapa", "Sacristía", "UNICO", 1, 0, "DISPONIBLE", "BUENO", "Orfebrería y vasos sagrados", 950, "Copón cincelado para reserva eucarística."],
  ["Juego de casullas (4 colores litúrgicos)", "Sacristía", "UNICO", 1, 0, "DISPONIBLE", "REGULAR", "Ornamentos y vestuario", 1200, "Blanca, verde, morada y roja. Bordado de espigas. La morada precisa reforzado de galón."],
  ["Estola y palia de fiesta", "Sacristía", "UNICO", 1, 0, "PRESTADO", "BUENO", "Ornamentos y vestuario", 180, "Prestada a la parroquia de San Miguel para confirmaciones (recoger en junio)."],
  ["Incensario y naveta de latón", "Sacristía", "UNICO", 1, 0, "MANTENIMIENTO", "REGULAR", "Material litúrgico", 260, "Cadena del incensario en reparación tras romperse un eslabón."],
  ["Vinajeras de cristal con bandeja", "Sacristía", "UNICO", 1, 0, "DISPONIBLE", "EXCELENTE", "Material litúrgico", 90, "Par de vinajeras con tapones de cruz y bandeja niquelada."],
  ["Crucifijo de altar mayor", "Presbiterio y Altar", "UNICO", 1, 0, "DISPONIBLE", "BUENO", "Material litúrgico", 420, "Crucifijo de bronce sobre peana de madera noble, 45 cm."],
  ["Candeleros de altar (juego de 6)", "Presbiterio y Altar", "UNICO", 1, 0, "DISPONIBLE", "BUENO", "Material litúrgico", 640, "Juego completo de seis candeleros de latón torneado."],
  ["Velas de altar (unidades)", "Presbiterio y Altar", "CONTABLE", 34, 12, "DISPONIBLE", "BUENO", "Consumibles", 120, "Cirios de cera de 60 cm para los candeleros del altar."],
  ["Libro de Bautismos · Tomo VII", "Despacho Parroquial", "UNICO", 1, 0, "DISPONIBLE", "BUENO", "Documentación y archivo", null, "Registro oficial desde 2014. Custodiado bajo llave."],
  ["Libros de cuentas de cofradías (archivo)", "Despacho Parroquial", "UNICO", 1, 0, "DISPONIBLE", "DETERIORADO", "Documentación y archivo", null, "Caja archivo con legajos 1978–2010. Valorar digitalización."],
  ["Portátil HP ProBook (secretaría)", "Despacho Parroquial", "UNICO", 1, 0, "DISPONIBLE", "BUENO", "Tecnología y sonido", 520, "Equipo de secretaría parroquial con software de gestión."],
  ["Sobres membretados (unidades)", "Despacho Parroquial", "CONTABLE", 260, 100, "DISPONIBLE", "BUENO", "Documentación y archivo", 24, "Sobres A5 con membrete y escudo parroquial."],
  ["Mesas plegables de resina", "Salón Parroquial", "CONTABLE", 22, 6, "DISPONIBLE", "BUENO", "Mobiliario", 1100, "Mesas de 180 cm para catequesis y convivencias."],
  ["Sillas apilables", "Salón Parroquial", "CONTABLE", 78, 20, "DISPONIBLE", "BUENO", "Mobiliario", 1560, "Sillas de polipropileno gris, apilables de 8 en 8."],
  ["Proyector Epson + pantalla", "Salón Parroquial", "UNICO", 1, 0, "DISPONIBLE", "EXCELENTE", "Tecnología y sonido", 610, "Para catequesis y cine-fórum. Pantalla de trípode de 2 m."],
  ["Equipo de megafonía portátil", "Salón Parroquial", "UNICO", 1, 0, "DISPONIBLE", "BUENO", "Tecnología y sonido", 340, "Con dos micrófonos inalámbricos y batería recargable."],
  ["Cafetera industrial 60 tazas", "Salón Parroquial", "UNICO", 1, 0, "DISPONIBLE", "REGULAR", "Cocina y despensa", 130, "Termo-percoladora para convivencias. Mango algo flojo."],
  ["Cajas de hostias (cajas de 500)", "Almacén", "CONTABLE", 14, 6, "DISPONIBLE", "BUENO", "Consumibles", 168, "Hostias de pan ácimo. Revisar fecha de consumo preferente."],
  ["Velas de cera para ofrenda (unidades)", "Almacén", "CONTABLE", 240, 60, "DISPONIBLE", "BUENO", "Consumibles", 96, "Velas de 20 cm para candelero de intenciones."],
  ["Vino de misa (botellas)", "Almacén", "CONTABLE", 5, 8, "DISPONIBLE", "BUENO", "Consumibles", 40, "Vino de misa de Jerez. Pedir a la bodega en la próxima orden."],
  ["Incienso en grano (paquetes 500 g)", "Almacén", "CONTABLE", 2, 4, "DISPONIBLE", "BUENO", "Consumibles", 30, "Mezcla de incienso pontifical para solemnidades."],
  ["Productos de limpieza (lotes)", "Almacén", "CONTABLE", 9, 3, "DISPONIBLE", "BUENO", "Limpieza y mantenimiento", 85, "Lotes con lejía, fregasuelos y paños para la limpieza semanal."],
  ["Teclado digital Yamaha P-125", "Coro", "UNICO", 1, 0, "DISPONIBLE", "EXCELENTE", "Tecnología y sonido", 640, "Piano digital del coro parroquial con soporte y pedal."],
  ["Atriles para partituras", "Coro", "CONTABLE", 11, 8, "DISPONIBLE", "BUENO", "Mobiliario", 165, "Atriles plegables negros con funda."],
];

const EXTRA_MOVEMENTS = [
  ["Vinajeras de cristal con bandeja", "ESTADO", 0, "DISPONIBLE → DISPONIBLE · Revisión pascual"],
  ["Velas de altar (unidades)", "SALIDA", 6, "-6 uds · Semana Santa"],
  ["Velas de cera para ofrenda (unidades)", "ENTRADA", 100, "+100 uds · Compra mensual"],
  ["Vino de misa (botellas)", "SALIDA", 3, "-3 uds · Misas del mes"],
  ["Estola y palia de fiesta", "ESTADO", 0, "DISPONIBLE → PRESTADO · P. San Miguel"],
  ["Mesas plegables de resina", "ENTRADA", 2, "+2 uds · Donación Cáritas"],
];

async function main() {
  const client = await pool.connect();
  try {
    const existing = await client.query("SELECT count(*)::int AS n FROM zones");
    if (existing.rows[0].n > 0) {
      console.log("La base de datos ya contiene datos; semilla omitida.");
      return;
    }

    await client.query("BEGIN");

    const zoneIds = {};
    for (const z of ZONES) {
      const { rows } = await client.query(
        `INSERT INTO zones (name, slug, description, color, icon) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [z.name, slugify(z.name), z.description, z.color, z.icon],
      );
      zoneIds[z.name] = rows[0].id;
    }

    for (const [i, it] of ITEMS.entries()) {
      const [name, zone, type, qty, min, status, cond, cat, value, desc] = it;
      const p = prefix(zone);
      const temp = `TMP-${i}-${Date.now()}`;
      const { rows } = await client.query(
        `INSERT INTO items (code, name, description, category, zone_id, item_type, quantity, min_quantity, status, condition, estimated_value, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, now() - ($12 || ' days')::interval, now() - ($12 || ' days')::interval)
         RETURNING id`,
        [temp, name, desc, cat, zoneIds[zone], type, qty, min, status, cond, value, String(200 - i * 7)],
      );
      const id = rows[0].id;
      const code = `${p}-${String(id).padStart(4, "0")}`;
      await client.query(`UPDATE items SET code = $1 WHERE id = $2`, [code, id]);
      await client.query(
        `INSERT INTO movements (item_id, type, quantity, note, created_at) VALUES ($1,'ALTA',$2,$3, now() - ($4 || ' days')::interval)`,
        [id, qty, `Alta en el inventario · Zona: ${zone}`, String(200 - i * 7)],
      );
    }

    for (const [i, [name, type, qty, note]] of EXTRA_MOVEMENTS.entries()) {
      await client.query(
        `INSERT INTO movements (item_id, type, quantity, note, created_at)
         SELECT id, $2, $3, $4, now() - ($5 || ' days')::interval FROM items WHERE name = $1`,
        [name, type, qty, note, String(12 - i * 2)],
      );
    }

    await client.query("COMMIT");
    console.log(`Semilla completada: ${ZONES.length} zonas, ${ITEMS.length} artículos.`);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
