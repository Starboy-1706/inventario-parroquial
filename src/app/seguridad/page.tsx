import { getClientIp, getSecuritySnapshot, pageMetadata, requireAuthorizedIp } from "@/lib/access";
import { AllowlistManager } from "@/components/allowlist-manager";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return pageMetadata("Seguridad");
}

export default async function SeguridadPage() {
  await requireAuthorizedIp();
  const [{ rows, attempts, schemaReady }, client] = await Promise.all([
    getSecuritySnapshot(),
    getClientIp(),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8 lg:py-12">
      <header className="animate-fade-up">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-gold">
          Lista blanca de acceso
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          Seguridad
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">
          Solo los dispositivos cuya IP figure en esta lista pueden ver la
          aplicación. El resto recibe una página completamente en blanco: ni la
          interfaz, ni el código, ni los datos. Comprobado en el servidor, de
          forma imposible de saltar desde el navegador.
        </p>
      </header>

      <div className="mt-8 animate-fade-up" style={{ animationDelay: "140ms" }}>
        <AllowlistManager
          rows={rows}
          clientIp={client.ip}
          attempts={attempts}
          schemaReady={schemaReady}
        />
      </div>

      <div className="no-print mt-8 rounded-3xl border border-line bg-cream/70 p-5 text-xs leading-relaxed text-ink-soft sm:p-6">
        <p className="font-semibold text-ink">Buenas prácticas:</p>
        <ul className="mt-2 list-disc space-y-1.5 pl-5">
          <li>
            Anota la IP de la red de la parroquia y de tu casa cuando estén
            quietas — si tu operador las cambia dinámicamente, necesitarás
            re-autorizar la nueva.
          </li>
          <li>
            Para redes enteras puedes usar rangos CIDR, p. ej.{" "}
            <code className="rounded bg-white px-1 py-0.5 font-mono text-[0.7rem]">80.102.45.0/24</code>.
          </li>
          <li>
            Tu propio dispositivo no se puede eliminar de la lista: así nunca
            te dejarás fuera por accidente.
          </li>
        </ul>
      </div>
    </div>
  );
}
