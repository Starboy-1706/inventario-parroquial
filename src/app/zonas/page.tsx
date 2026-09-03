import { getZonesWithCounts } from "@/lib/queries";
import { ZoneManager } from "@/components/zone-manager";
import { pageMetadata, requireAuthorizedIp } from "@/lib/access";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return pageMetadata("Zonas");
}

export default async function ZonasPage() {
  await requireAuthorizedIp();
  const zones = await getZonesWithCounts();

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-12">
      <header className="animate-fade-up">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-gold">
          Ubicaciones físicas
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          Zonas de la parroquia
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">
          Cada artículo vive en una zona: sacristía, despacho, salón parroquial…
          Filtra el inventario por zona y genera etiquetas con su prefijo
          correspondiente.
        </p>
      </header>

      <div className="mt-8 animate-fade-up" style={{ animationDelay: "140ms" }}>
        <ZoneManager zones={zones} />
      </div>
    </div>
  );
}
