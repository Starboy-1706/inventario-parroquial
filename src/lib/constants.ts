export const ITEM_TYPES = ["UNICO", "CONTABLE"] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  UNICO: "Pieza única",
  CONTABLE: "Acumulable",
};

export const STATUSES = [
  "DISPONIBLE",
  "PRESTADO",
  "MANTENIMIENTO",
  "BAJA",
] as const;
export type ItemStatus = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<ItemStatus, string> = {
  DISPONIBLE: "En su lugar",
  PRESTADO: "Prestado",
  MANTENIMIENTO: "Mantenimiento",
  BAJA: "Dado de baja",
};

export const STATUS_STYLES: Record<
  ItemStatus,
  { dot: string; badge: string }
> = {
  DISPONIBLE: {
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
  PRESTADO: {
    dot: "bg-sky-500",
    badge: "bg-sky-50 text-sky-800 border-sky-200",
  },
  MANTENIMIENTO: {
    dot: "bg-amber-500",
    badge: "bg-amber-50 text-amber-800 border-amber-200",
  },
  BAJA: {
    dot: "bg-stone-400",
    badge: "bg-stone-100 text-stone-500 border-stone-200",
  },
};

export const CONDITIONS = [
  "EXCELENTE",
  "BUENO",
  "REGULAR",
  "DETERIORADO",
] as const;
export type ItemCondition = (typeof CONDITIONS)[number];

export const CONDITION_LABELS: Record<ItemCondition, string> = {
  EXCELENTE: "Excelente",
  BUENO: "Bueno",
  REGULAR: "Regular",
  DETERIORADO: "Deteriorado",
};

export const MOVEMENT_TYPES = [
  "ALTA",
  "ENTRADA",
  "SALIDA",
  "AJUSTE",
  "TRASLADO",
  "ESTADO",
  "EDICION",
  "BAJA",
  "PAPELERA",
  "RESTAURACION",
  "PRESTAMO",
  "DEVOLUCION",
  "MANTENIMIENTO",
  "MANTENIMIENTO_FIN",
] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

export const MOVEMENT_LABELS: Record<MovementType, string> = {
  ALTA: "Alta en inventario", ENTRADA: "Entrada", SALIDA: "Salida",
  AJUSTE: "Ajuste de recuento", TRASLADO: "Traslado de zona",
  ESTADO: "Cambio de estado", EDICION: "Edición de ficha", BAJA: "Baja",
  PAPELERA: "Enviado a papelera", RESTAURACION: "Restaurado",
  PRESTAMO: "Préstamo", DEVOLUCION: "Devolución",
  MANTENIMIENTO: "Inicio de mantenimiento", MANTENIMIENTO_FIN: "Fin de mantenimiento",
};

export const CATEGORIES = [
  "Orfebrería y vasos sagrados",
  "Ornamentos y vestuario",
  "Mobiliario",
  "Material litúrgico",
  "Consumibles",
  "Limpieza y mantenimiento",
  "Tecnología y sonido",
  "Documentación y archivo",
  "Cocina y despensa",
  "Otros",
] as const;

export const ZONE_ICONS = [
  "church",
  "archive",
  "armchair",
  "users",
  "warehouse",
  "utensils",
  "lamp",
  "door",
  "book",
  "music",
] as const;

export const ZONE_COLORS = [
  "#A67C2D", // latón
  "#2E4B3A", // verde sacristía
  "#7C3532", // vino
  "#3E5C76", // azul pizarra
  "#6B4E9B", // morado cuaresma
  "#8A6D3B", // madera
  "#4A7A6E", // verde grisáceo
  "#B0653A", // terracota
] as const;
