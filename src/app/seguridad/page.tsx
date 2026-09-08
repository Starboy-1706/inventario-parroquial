import { authPageMetadata, getSessionInfo, requireAuthenticated } from "@/lib/auth";
import { SecurityPanel } from "@/components/security-panel";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return authPageMetadata("Seguridad");
}

export default async function SeguridadPage() {
  await requireAuthenticated();
  const session = await getSessionInfo();
  const expiresAt = session.expiresAt
    ? new Intl.DateTimeFormat("es-ES", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(session.expiresAt)
    : "—";

  return (
    <div className="mx-auto max-w-3xl px-4 py-5 sm:px-8 sm:py-12">
      <header className="animate-fade-up">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-gold">
          Control de acceso
        </p>
        <h1 className="mt-1.5 font-display text-2xl font-semibold tracking-tight text-ink sm:text-4xl lg:text-5xl">
          Seguridad
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">
          El inventario está protegido por una clave privada y una sesión firmada.
          Ya no depende de IPs, redes WiFi ni cambios del operador móvil.
        </p>
      </header>

      <div className="mt-8 animate-fade-up" style={{ animationDelay: "120ms" }}>
        <SecurityPanel expiresAt={expiresAt} />
      </div>
    </div>
  );
}
