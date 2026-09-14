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
    dims: [8, 5, 3.2],
  },
  {
    name: "Presbiterio y Altar",
    description: "Enseres del altar mayor y el presbiterio",
    color: "#2E4B3A",
    icon: "lamp",
    dims: [12, 7, 9],
  },
  {
    name: "Despacho Parroquial",
    description: "Archivo, documentación y material de oficina",
    color: "#3E5C76",
    icon: "archive",
    dims: [6, 4, 2.8],
  },
  {
    name: "Salón Parroquial",
    description: "Mobiliario y equipamiento para catequesis y reuniones",
    color: "#B0653A",
    icon: "users",
    dims: [15, 9, 3.5],
  },
  {
    name: "Almacén",
    description: "Consumibles, limpieza y reservas",
    color: "#8A6D3B",
    icon: "warehouse",
    dims: [7, 4, 2.6],
  },
  {
    name: "Coro",
    description: "Instrumentos y material musical",
    color: "#6B4E9B",
    icon: "music",
    dims: [10, 6, 8],
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

// Medidas de ejemplo en centímetros: [largo, ancho, alto]
const ITEM_DIMS_CM = {
  "Cáliz de plata dorada (s. XIX)": [22, 12, 12],
  "Custodia barroca de altar": [58, 20, 20],
  "Copón de plata con tapa": [18, 10, 10],
  "Crucifijo de altar mayor": [45, 18, 8],
  "Candeleros de altar (juego de 6)": [40, 14, 14],
  "Velas de altar (unidades)": [60, 4, 4],
  "Portátil HP ProBook (secretaría)": [36, 24.5, 2],
  "Mesas plegables de resina": [180, 74, 74],
  "Sillas apilables": [86, 50, 48],
  "Proyector Epson + pantalla": [30, 24, 10],
  "Cafetera industrial 60 tazas": [45, 35, 35],
  "Cajas de hostias (cajas de 500)": [25, 18, 8],
  "Vino de misa (botellas)": [30, 8, 8],
  "Teclado digital Yamaha P-125": [132, 29, 16],
  "Atriles para partituras": [100, 45, 5],
  "Libro de Bautismos · Tomo VII": [35, 26, 7],
};

// Ubicaciones exactas por zona: [nombre, tipo, nombre del padre o null]
const LOCATIONS = {
  "Sacristía": [
    ["Armario de ornamentos", "ARMARIO", null],
    ["Balda superior", "ESTANTE", "Armario de ornamentos"],
    ["Cajón de corporales", "CAJON", "Armario de ornamentos"],
    ["Vitrina de orfebrería", "VITRINA", null],
    ["Caja fuerte", "CAJA_FUERTE", null],
  ],
  "Presbiterio y Altar": [
    ["Credencia", "MESA", null],
    ["Armario del presbiterio", "ARMARIO", null],
  ],
  "Despacho Parroquial": [
    ["Archivero A", "ARCHIVERO", null],
    ["Gaveta 1 (Bautismos)", "CAJON", "Archivero A"],
    ["Gaveta 2 (Matrimonios)", "CAJON", "Archivero A"],
    ["Estantería de libros", "ESTANTERIA", null],
  ],
  "Salón Parroquial": [
    ["Almacén del salón", "ARMARIO", null],
    ["Estantería de material", "ESTANTERIA", null],
  ],
  "Almacén": [
    ["Estantería metálica", "ESTANTERIA", null],
    ["Balda de consumibles", "ESTANTE", "Estantería metálica"],
    ["Baúl de limpieza", "BAUL", null],
  ],
  "Coro": [
    ["Armario de partituras", "ARMARIO", null],
  ],
};

// Ficha técnica de ejemplo: nombre -> { marca, modelo, material, color, peso, proveedor, ubicación }
const ITEM_SPECS = {
  "Cáliz de plata dorada (s. XIX)": { brand: "Talleres Granda", model: "Gótico 340", material: "Plata de ley sobredorada", color: "Dorado brillante", weight: 0.82, supplier: "Donación familia Herrero", location: "Vitrina de orfebrería" },
  "Custodia barroca de altar": { brand: "Orfebrería Molina", model: "Sol Radiante XL", material: "Plata sobredorada", color: "Dorado", weight: 3.4, location: "Vitrina de orfebrería" },
  "Copón de plata con tapa": { brand: "Talleres Granda", model: "Clásico 210", material: "Plata de ley", color: "Plateado", weight: 0.64, location: "Caja fuerte" },
  "Juego de casullas (4 colores litúrgicos)": { brand: "Sedas Toledo", model: "Espigas", material: "Poliéster y seda", color: "4 colores litúrgicos", weight: 2.2, location: "Armario de ornamentos" },
  "Incensario y naveta de latón": { brand: "Metalistería Ortiz", model: "Tradicional", material: "Latón", color: "Dorado envejecido", weight: 1.1, location: "Armario de ornamentos" },
  "Crucifijo de altar mayor": { brand: "Arte Sacro León", model: "Bronce 45", material: "Bronce y nogal", color: "Bronce oscuro", weight: 4.6, location: "Credencia" },
  "Candeleros de altar (juego de 6)": { brand: "Metalistería Ortiz", model: "Torneado 6P", material: "Latón", color: "Dorado", weight: 7.8, location: "Armario del presbiterio" },
  "Velas de altar (unidades)": { brand: "Ceras Aurora", model: "Litúrgica 60", material: "Cera 65%", color: "Marfil", location: "Credencia" },
  "Libro de Bautismos · Tomo VII": { material: "Papel verjurado y piel", color: "Burdeos", location: "Gaveta 1 (Bautismos)" },
  "Portátil HP ProBook (secretaría)": { brand: "HP", model: "ProBook 450 G9", serial: "5CD2419XYZ", material: "Aluminio", color: "Plata", weight: 1.74, supplier: "Informática Belén", warranty: "2027-03-31", location: "Estantería de libros" },
  "Sobres membretados (unidades)": { brand: "Papelería Sanz", model: "A5 membrete", material: "Papel 90 g", color: "Blanco", location: "Archivero A" },
  "Mesas plegables de resina": { brand: "Lifetime", model: "80387", material: "Resina y acero", color: "Blanco", weight: 12.5, location: "Almacén del salón" },
  "Sillas apilables": { brand: "Resol", model: "Barcelona", material: "Polipropileno", color: "Gris", weight: 3.6, location: "Almacén del salón" },
  "Proyector Epson + pantalla": { brand: "Epson", model: "EB-W06", serial: "X4TF8900123", material: "Policarbonato", color: "Blanco", weight: 2.5, supplier: "Informática Belén", warranty: "2027-09-30", location: "Estantería de material" },
  "Equipo de megafonía portátil": { brand: "Fonestar", model: "MEGA-150", material: "ABS", color: "Negro", weight: 6.2, location: "Estantería de material" },
  "Cafetera industrial 60 tazas": { brand: "Lacor", model: "69060", material: "Acero inoxidable", color: "Inox", weight: 3.9, location: "Almacén del salón" },
  "Cajas de hostias (cajas de 500)": { brand: "Hermanas Clarisas", model: "Pan ácimo 35 mm", material: "Trigo", color: "Blanco", location: "Balda de consumibles" },
  "Velas de cera para ofrenda (unidades)": { brand: "Ceras Aurora", model: "Votiva 20", material: "Cera", color: "Marfil", location: "Balda de consumibles" },
  "Vino de misa (botellas)": { brand: "Bodegas Sacristía", model: "Jerez dulce 75 cl", material: "Vidrio", color: "Ámbar", location: "Balda de consumibles" },
  "Productos de limpieza (lotes)": { material: "Varios", location: "Baúl de limpieza" },
  "Teclado digital Yamaha P-125": { brand: "Yamaha", model: "P-125", serial: "YP125-8841", material: "ABS", color: "Negro", weight: 11.8, supplier: "Musical Aranda", warranty: "2026-12-31", location: "Armario de partituras" },
  "Atriles para partituras": { brand: "König & Meyer", model: "10062", material: "Acero", color: "Negro", weight: 2.1, location: "Armario de partituras" },
};

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
        `INSERT INTO zones (name, slug, description, color, icon, dim_length_m, dim_width_m, dim_height_m) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
        [z.name, slugify(z.name), z.description, z.color, z.icon, z.dims?.[0] ?? null, z.dims?.[1] ?? null, z.dims?.[2] ?? null],
      );
      zoneIds[z.name] = rows[0].id;
    }

    // Ubicaciones exactas (armarios, archiveros, cajones…)
    const locationIds = {};
    for (const [zoneName, list] of Object.entries(LOCATIONS)) {
      for (const [locName, kind, parentName] of list) {
        const { rows } = await client.query(
          `INSERT INTO storage_locations (zone_id, parent_id, name, kind) VALUES ($1,$2,$3,$4) RETURNING id`,
          [zoneIds[zoneName], parentName ? locationIds[parentName] : null, locName, kind],
        );
        locationIds[locName] = rows[0].id;
      }
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
      const spec = ITEM_SPECS[name];
      if (spec) {
        await client.query(
          `UPDATE items SET brand=$2, model=$3, serial_number=$4, material=$5, color=$6,
             weight_kg=$7, supplier=$8, warranty_until=$9, location_id=$10 WHERE id=$1`,
          [id, spec.brand ?? null, spec.model ?? null, spec.serial ?? null, spec.material ?? null,
           spec.color ?? null, spec.weight ?? null, spec.supplier ?? null, spec.warranty ?? null,
           spec.location ? locationIds[spec.location] ?? null : null],
        );
      }
      const dcm = ITEM_DIMS_CM[name];
      if (dcm) {
        await client.query(`UPDATE items SET dim_length_cm = $2, dim_width_cm = $3, dim_height_cm = $4 WHERE id = $1`, [id, dcm[0], dcm[1], dcm[2]]);
      }
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
