import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/**
 * Estado vacío — componente de SERVIDOR (sin "use client") para poder
 * recibir el icono como función desde Server Components (p. ej. la página
 * de inventario con cero resultados). Importado desde un Client Component
 * pasa a formar parte del bundle de cliente sin problema.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-line bg-cream/60 px-6 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gold/10 text-gold">
        <Icon className="h-6 w-6" strokeWidth={1.6} />
      </span>
      <h3 className="mt-4 font-display text-lg font-semibold text-ink">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-ink-soft">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
