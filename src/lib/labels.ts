/**
 * Utilidad compartida para las hojas de etiquetas QR en tamaño carta.
 *
 * Los artículos acumulables (CONTABLE) generan tantas etiquetas como
 * unidades existan, cada una numerada ("Ejemplar 3 de 25"), de modo que
 * cada pieza física pueda llevar su propia etiqueta identificativa.
 */

/** Límite de seguridad: evita imprimir miles de hojas por un error de cantidad. */
export const MAX_LABELS_PER_ITEM = 300;

export type LabelItemInput = {
  id: number;
  code: string;
  name: string;
  itemType: string;
  quantity: number;
};

export type LabelUnit = {
  /** Clave única de React por etiqueta física. */
  key: string;
  id: number;
  code: string;
  name: string;
  /**
   * Numeración del ejemplar: 1…N para acumulables; null para piezas únicas
   * (donde todas las copias de la etiqueta son idénticas).
   */
  unit: number | null;
  unitTotal: number | null;
};

/**
 * Expande artículos en etiquetas físicas.
 * - UNICO → una única etiqueta (sin numeración).
 * - CONTABLE → `quantity` etiquetas numeradas 1/N…N/N (máx. MAX_LABELS_PER_ITEM).
 */
export function expandLabelUnits(items: LabelItemInput[]): {
  units: LabelUnit[];
  /** Artículos cuya cantidad fue recortada por el límite de seguridad. */
  truncated: number;
} {
  const units: LabelUnit[] = [];
  let truncated = 0;
  for (const item of items) {
    if (item.itemType === "CONTABLE") {
      const total = Math.max(0, Math.min(item.quantity, MAX_LABELS_PER_ITEM));
      if (item.quantity > MAX_LABELS_PER_ITEM) truncated += 1;
      for (let i = 1; i <= total; i++) {
        units.push({
          key: `${item.id}-${i}`,
          id: item.id,
          code: item.code,
          name: item.name,
          unit: i,
          unitTotal: total,
        });
      }
    } else {
      units.push({
        key: `${item.id}-0`,
        id: item.id,
        code: item.code,
        name: item.name,
        unit: null,
        unitTotal: null,
      });
    }
  }
  return { units, truncated };
}

/** Divide una lista en páginas de `size` elementos. */
export function chunkPages<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
