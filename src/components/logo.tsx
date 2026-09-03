import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={cn("h-8 w-8", className)}>
      {/* Arco gótico en latón */}
      <path
        d="M16 2.5C10.5 7.5 7 11.5 7 15.5V29h18V15.5c0-4-3.5-8-9-13Z"
        className="fill-gold/20 stroke-gold"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {/* Cruz */}
      <path
        d="M16 10v12M11.5 14.5h9"
        className="stroke-gold-soft"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="16" cy="26" r="1.4" className="fill-gold-soft" />
    </svg>
  );
}

export function LogoWord({ className }: { className?: string }) {
  return (
    <span className={cn("leading-tight", className)}>
      <span className="block font-display text-[1.05rem] font-semibold tracking-tight text-cream">
        Sacristía Digital
      </span>
      <span className="mt-0.5 block text-[0.6rem] font-medium uppercase tracking-[0.24em] text-gold-soft/80">
        Inventario parroquial
      </span>
    </span>
  );
}
