import { getZonesWithCounts } from "@/lib/queries";
import { ZoneManager } from "@/components/zone-manager";
import { authPageMetadata, requireAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return authPageMetadata("Zonas");
}

export default async function ZonasPage() {
  await requireAuthenticated();
  const zones = await getZonesWithCounts();

  return (
    <div className="mx-auto max-w-6xl px-4 py-5 sm:px-8 sm:py-12">
      <header className="animate-fade-up">
        <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-gold-deep dark:text-gold-soft sm:text-[0.65rem]">
          Ubicaciones físicas
        </p>
        <h1 className="mt-1.5 font-display text-2xl font-semibold tracking-tight text-ink sm:text-4xl lg:text-5xl">
          Zonas de la parroquia
        </h1>
        <p className="mt-1.5 max-w-xl text-xs leading-relaxed text-ink-soft sm:text-sm">
          Organiza cada artículo por estancia y define su lugar exacto dentro de
          armarios, estantes o cajas.
        </p>
      </header>

      <div className="mt-5 animate-fade-up sm:mt-8" style={{ animationDelay: "140ms" }}>
        <ZoneManager zones={zones} />
      </div>
    </div>
  );
}
