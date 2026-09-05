import { z } from "zod";
import { CONDITIONS, STATUSES } from "@/lib/constants";

export function parseSpanishMoney(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw === "number") {
    return Number.isFinite(raw) && raw >= 0 && raw <= 100_000_000 ? raw : NaN;
  }
  if (typeof raw !== "string") return NaN;
  let value = raw.trim().replace(/[€\s]/g, "");
  if (!value) return null;

  if (value.includes(",")) {
    // Español: puntos de miles, coma decimal.
    if (!/^\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?$|^\d+(?:,\d{1,2})?$/.test(value)) {
      return NaN;
    }
    value = value.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(?:\.\d{3})+$/.test(value)) {
    // 1.200 o 1.200.000 → separadores de miles.
    value = value.replace(/\./g, "");
  } else if (!/^\d+(?:\.\d{1,2})?$/.test(value)) {
    return NaN;
  }

  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= 100_000_000
    ? number
    : NaN;
}

const nullableText = (max: number) =>
  z
    .union([z.string().max(max), z.null(), z.undefined()])
    .transform((v) => (typeof v === "string" ? v.trim() || null : null));

const nullablePositiveId = z
  .union([z.coerce.number().int().positive(), z.null(), z.undefined()])
  .transform((v) => v ?? null);

const dateField = z
  .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal(""), z.null(), z.undefined()])
  .transform((v) => (v ? v : null));

const moneyField = z.unknown().transform((value, ctx) => {
  const parsed = parseSpanishMoney(value);
  if (Number.isNaN(parsed)) {
    ctx.addIssue({
      code: "custom",
      message: "Valor económico no válido. Usa, por ejemplo, 1.200,50.",
    });
    return z.NEVER;
  }
  return parsed;
});

export const itemCreateSchema = z
  .object({
    name: z.string().trim().min(1, "El nombre es obligatorio.").max(160),
    description: nullableText(2_000),
    notes: nullableText(2_000),
    category: z.string().trim().min(1).max(120),
    zoneId: z.coerce.number().int().positive(),
    locationId: nullablePositiveId,
    photoId: nullablePositiveId,
    photoIds: z.array(z.coerce.number().int().positive()).max(12).optional().default([]),
    itemType: z.enum(["UNICO", "CONTABLE"]),
    quantity: z.coerce.number().int().min(0).max(1_000_000),
    minQuantity: z.coerce.number().int().min(0).max(1_000_000),
    status: z.enum(STATUSES),
    condition: z.enum(CONDITIONS),
    acquisitionDate: dateField,
    estimatedValue: moneyField,
    externalBarcode: nullableText(128),
  })
  .transform((data) => ({
    ...data,
    quantity: data.itemType === "UNICO" ? 1 : data.quantity,
    minQuantity: data.itemType === "UNICO" ? 0 : data.minQuantity,
  }));

export const itemUpdateSchema = z
  .object({
    version: z.coerce.number().int().positive(),
    name: z.string().trim().min(1).max(160).optional(),
    description: nullableText(2_000).optional(),
    notes: nullableText(2_000).optional(),
    category: z.string().trim().min(1).max(120).optional(),
    zoneId: z.coerce.number().int().positive().optional(),
    locationId: nullablePositiveId.optional(),
    photoId: nullablePositiveId.optional(),
    photoIds: z.array(z.coerce.number().int().positive()).max(12).optional(),
    itemType: z.enum(["UNICO", "CONTABLE"]).optional(),
    quantity: z.coerce.number().int().min(0).max(1_000_000).optional(),
    minQuantity: z.coerce.number().int().min(0).max(1_000_000).optional(),
    status: z.enum(STATUSES).optional(),
    condition: z.enum(CONDITIONS).optional(),
    acquisitionDate: dateField.optional(),
    estimatedValue: moneyField.optional(),
    externalBarcode: nullableText(128).optional(),
    deletedReason: nullableText(500).optional(),
  })
  .strict();

export const zoneSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio.").max(100),
  description: nullableText(500),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  icon: z.string().trim().min(1).max(40),
  photoId: nullablePositiveId,
});

export function zodErrorMessage(error: z.ZodError) {
  return error.issues[0]?.message ?? "Los datos introducidos no son válidos.";
}
