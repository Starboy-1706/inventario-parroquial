"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import {
  Archive,
  Armchair,
  Book,
  Church,
  DoorOpen,
  Lamp,
  Music,
  Utensils,
  Users,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import {
  CONDITION_LABELS,
  STATUS_LABELS,
  STATUS_STYLES,
  type ItemCondition,
  type ItemStatus,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

/* ------------------------------ Botones ------------------------------ */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "dark" | "ghost" | "danger" | "outline";
  size?: "sm" | "md";
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-full font-semibold transition-all duration-200 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100",
        size === "sm"
          ? "min-h-10 px-3.5 py-1.5 text-xs"
          : "min-h-11 px-5 py-2.5 text-sm",
        variant === "primary" &&
          "bg-gold text-ink shadow-lift hover:bg-gold-soft",
        variant === "dark" && "bg-ink text-cream hover:bg-ink/85",
        variant === "ghost" && "text-ink-soft hover:bg-ink/5 hover:text-ink",
        variant === "outline" &&
          "border border-line bg-cream text-ink hover:border-ink/25",
        variant === "danger" &&
          "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
        className,
      )}
      {...props}
    />
  );
}

/* ------------------------------ Insignias ------------------------------ */

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const s = (STATUS_LABELS[status as ItemStatus] ? status : "DISPONIBLE") as ItemStatus;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.68rem] font-semibold",
        STATUS_STYLES[s].badge,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_STYLES[s].dot)} />
      {STATUS_LABELS[s]}
    </span>
  );
}

export function TypeBadge({ type }: { type: string }) {
  const unique = type === "UNICO";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.68rem] font-semibold",
        unique
          ? "border-violet-200 bg-violet-50 text-violet-700"
          : "border-sky-200 bg-sky-50 text-sky-700",
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", unique ? "bg-violet-500" : "bg-sky-500")} />
      {unique ? "Pieza única" : "Acumulable"}
    </span>
  );
}

export function ConditionBadge({ condition }: { condition: string }) {
  const palette: Record<string, string> = {
    EXCELENTE: "border-emerald-200 bg-emerald-50 text-emerald-700",
    BUENO: "border-stone-200 bg-stone-100 text-stone-600",
    REGULAR: "border-amber-200 bg-amber-50 text-amber-700",
    DETERIORADO: "border-red-200 bg-red-50 text-red-700",
  };
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-0.5 text-[0.68rem] font-semibold",
        palette[condition] ?? palette.BUENO,
      )}
    >
      {CONDITION_LABELS[condition as ItemCondition] ?? condition}
    </span>
  );
}

/* ------------------------------ Icono de zona ------------------------------ */

const ZONE_ICON_MAP: Record<string, LucideIcon> = {
  church: Church,
  archive: Archive,
  armchair: Armchair,
  users: Users,
  warehouse: Warehouse,
  utensils: Utensils,
  lamp: Lamp,
  door: DoorOpen,
  book: Book,
  music: Music,
};

export function ZoneIcon({
  icon,
  color,
  size = "md",
  className,
}: {
  icon: string;
  color: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const Icon = ZONE_ICON_MAP[icon] ?? Church;
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl",
        size === "sm" && "h-8 w-8",
        size === "md" && "h-10 w-10",
        size === "lg" && "h-12 w-12",
        className,
      )}
      style={{ backgroundColor: `${color}1A`, color }}
    >
      <Icon
        className={cn(size === "sm" && "h-4 w-4", size === "md" && "h-[1.15rem] w-[1.15rem]", size === "lg" && "h-[1.35rem] w-[1.35rem]")}
        strokeWidth={1.8}
      />
    </span>
  );
}

/* ------------------------------ Formularios ------------------------------ */

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-ink-soft">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[0.7rem] text-ink-faint">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "w-full rounded-xl border border-line bg-white/70 px-3.5 py-2.5 text-base sm:text-sm text-ink outline-none transition placeholder:text-ink-faint focus:border-gold focus:ring-2 focus:ring-gold/20";

/* ------------------------------ Varios ------------------------------ */

export function SectionHeading({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-[1.7rem]">
          {title}
        </h2>
        {subtitle && <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
