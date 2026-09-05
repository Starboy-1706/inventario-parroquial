import { Suspense } from "react";
import { QrCode, Smartphone, Barcode } from "lucide-react";
import { Scanner } from "@/components/scanner";
import { authPageMetadata, requireAuthenticated } from "@/lib/auth";

export async function generateMetadata() {
  return authPageMetadata("Escáner");
}

export const dynamic = "force-dynamic";

const TIPS = [
  {
    icon: QrCode,
    title: "QR y códigos de barras",
    text: "Compatible con las etiquetas QR generadas en la app y con códigos Code-128, EAN y UPC de productos.",
  },
  {
    icon: Smartphone,
    title: "Pensado para el móvil",
    text: "Usa la cámara trasera de tu teléfono mientras recorres cada zona de la parroquia haciendo el recuento.",
  },
  {
    icon: Barcode,
    title: "Consulta al instante",
    text: "Cada lectura muestra la ficha del artículo, su zona y permite ajustar existencias al momento.",
  },
];

export default async function EscanerPage() {
  await requireAuthenticated();
  return (
    <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8 lg:py-12">
      <header className="animate-fade-up text-center">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-gold">
          Lectura en tiempo real
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          Escáner de <em className="italic text-gold-deep">códigos</em>
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-soft">
          Enciende la cámara y apunta a la etiqueta del artículo. La consulta es
          instantánea y queda todo listo para actualizar existencias.
        </p>
      </header>

      <div className="mt-8 animate-fade-up" style={{ animationDelay: "140ms" }}>
        <Suspense>
          <Scanner />
        </Suspense>
      </div>

      <ul className="no-print mt-10 grid gap-4 sm:grid-cols-3">
        {TIPS.map((t, i) => (
          <li
            key={t.title}
            className="animate-fade-up rounded-2xl border border-line bg-cream p-4 shadow-card"
            style={{ animationDelay: `${260 + i * 80}ms` }}
          >
            <t.icon className="h-5 w-5 text-gold" strokeWidth={1.7} />
            <h3 className="mt-2.5 text-sm font-bold text-ink">{t.title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-ink-soft">{t.text}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
