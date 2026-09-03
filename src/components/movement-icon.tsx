import {
  ArrowDownLeft,
  ArrowRightLeft,
  ArrowUpRight,
  ClipboardList,
  PlusCircle,
  RefreshCcw,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import type { MovementType } from "@/lib/constants";
import { cn } from "@/lib/utils";

const ICONS: Record<MovementType, LucideIcon> = {
  ALTA: PlusCircle,
  ENTRADA: ArrowDownLeft,
  SALIDA: ArrowUpRight,
  AJUSTE: ClipboardList,
  TRASLADO: ArrowRightLeft,
  ESTADO: RefreshCcw,
  BAJA: Trash2,
};

const TINTS: Record<MovementType, string> = {
  ALTA: "bg-emerald-100 text-emerald-700 border-emerald-200",
  ENTRADA: "bg-emerald-100 text-emerald-700 border-emerald-200",
  SALIDA: "bg-amber-100 text-amber-700 border-amber-200",
  AJUSTE: "bg-sky-100 text-sky-700 border-sky-200",
  TRASLADO: "bg-violet-100 text-violet-700 border-violet-200",
  ESTADO: "bg-stone-200/70 text-stone-600 border-stone-300",
  BAJA: "bg-red-100 text-red-700 border-red-200",
};

export function MovementIcon({
  type,
  className,
}: {
  type: string;
  className?: string;
}) {
  const Icon = ICONS[type as MovementType] ?? ClipboardList;
  return (
    <span
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
        TINTS[type as MovementType] ?? TINTS.ESTADO,
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2} />
    </span>
  );
}
