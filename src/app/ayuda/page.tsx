import Link from "next/link";
import {
  Boxes,
  Camera,
  ClipboardCheck,
  FileSpreadsheet,
  Handshake,
  HelpCircle,
  PackagePlus,
  Printer,
  QrCode,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { authPageMetadata, requireAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return authPageMetadata("Manual de ayuda");
}

const GUIDES = [
  {
    icon: PackagePlus,
    title: "1. Dar de alta artículos",
    steps: [
      "Ve a «Inventario» y pulsa «Nuevo artículo».",
      "Elige si es Pieza única (1 ud, cáliz, casulla) o Acumulable (velas, formas).",
      "Escribe el valor económico en euros (admite comas, ej. 1.200,50).",
      "Sube una o varias fotografías directamente desde la cámara del móvil.",
      "Al guardar, el sistema generará automáticamente un código permanente PSB-000001.",
    ],
  },
  {
    icon: Printer,
    title: "2. Imprimir y pegar etiquetas QR",
    steps: [
      "En la ficha de cualquier artículo, pulsa «Imprimir etiqueta».",
      "Elige el formato de hoja A4: 1 grande, 4 medianas o 9 pequeñas.",
      "Imprime en papel adhesivo A4 o cartulina.",
      "Corta siguiendo las líneas punteadas y pega en el cajón, estante u objeto.",
      "Las etiquetas incluyen el nombre oficial: Parroquia Santa Bárbara.",
    ],
  },
  {
    icon: Camera,
    title: "3. Escáner con la cámara del móvil",
    steps: [
      "Entra en «Escáner» desde la barra inferior de tu teléfono.",
      "Permite el acceso a la cámara cuando el navegador te lo pida.",
      "Apunta a cualquier código QR o código de barras comercial.",
      "El sistema emitirá un sonido de confirmación y abrirá la ficha.",
      "Para artículos acumulables (velas, vino), puedes ajustar existencias con los botones ±1 al instante.",
    ],
  },
  {
    icon: ClipboardCheck,
    title: "4. Modo Recuento físico anual",
    steps: [
      "Entra en «Recuento» y pulsa «Iniciar nuevo recuento» eligiendo la zona.",
      "Recorre la estancia escaneando cada etiqueta encontrada con el móvil.",
      "La barra de progreso te muestra el porcentaje verificado en tiempo real.",
      "Si un objeto pertenece a otra zona o falta, la app te avisará con alerta.",
      "Al terminar, pulsa «Finalizar recuento» para ajustar stock automáticamente.",
    ],
  },
  {
    icon: Handshake,
    title: "5. Préstamos y Mantenimiento",
    steps: [
      "En la ficha del artículo, abre la pestaña «Préstamos» o «Mantenimiento».",
      "Anota a quién se prestó y la fecha prevista de devolución.",
      "En «Informes» podrás ver en rojo los préstamos vencidos que requieren aviso.",
      "Cuando te lo devuelvan, pulsa «Devuelto» para reponer su estado.",
    ],
  },
  {
    icon: FileSpreadsheet,
    title: "6. Copias de seguridad y Excel",
    steps: [
      "En «Inventario» pulsa «Exportar CSV» para abrirlo directamente en Microsoft Excel.",
      "En «Seguridad» tienes el botón «Descargar respaldo completo (JSON+CSV)».",
      "En «Informes» puedes generar el Balance Anual Oficial para el Consejo Parroquial.",
    ],
  },
];

export default async function AyudaPage() {
  await requireAuthenticated();

  return (
    <div className="mx-auto max-w-5xl px-4 py-5 sm:px-8 sm:py-12">
      <header className="animate-fade-up">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-gold">
          Manual para el equipo parroquial
        </p>
        <h1 className="mt-1.5 font-display text-2xl font-semibold tracking-tight text-ink sm:text-4xl lg:text-5xl">
          Guía de uso
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">
          Todo lo necesario para inventariar, imprimir etiquetas y realizar
          recuentos en la Parroquia Santa Bárbara de forma ordenada y sencilla.
        </p>
      </header>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {GUIDES.map((g, i) => (
          <section
            key={g.title}
            className="animate-fade-up rounded-3xl border border-line bg-cream p-5 shadow-card sm:p-6"
            style={{ animationDelay: `${80 + i * 50}ms` }}
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gold/15 text-gold-deep">
              <g.icon className="h-5 w-5" strokeWidth={1.8} />
            </span>
            <h2 className="mt-3.5 font-display text-lg font-semibold tracking-tight text-ink">
              {g.title}
            </h2>
            <ol className="mt-3 space-y-2 text-xs leading-relaxed text-ink-soft">
              {g.steps.map((step, sIndex) => (
                <li key={sIndex} className="flex items-start gap-2">
                  <span className="font-bold text-gold-deep">{sIndex + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>

      <div className="mt-10 rounded-3xl border border-gold/30 bg-gold/10 p-6 text-center">
        <Sparkles className="mx-auto h-6 w-6 text-gold-deep" />
        <h3 className="mt-2 font-display text-lg font-semibold text-ink">
          ¿Dudas sobre el inventario?
        </h3>
        <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-ink-soft">
          Para añadir una estancia nueva ve a «Zonas». Para auditar el inventario
          en mano usa «Modo Recuento» en el móvil.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Link
            href="/inventario/nuevo"
            className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-cream"
          >
            <PackagePlus className="h-3.5 w-3.5 text-gold-soft" />
            Nuevo artículo
          </Link>
          <Link
            href="/recuento"
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-4 py-2 text-xs font-semibold text-ink"
          >
            <ClipboardCheck className="h-3.5 w-3.5 text-gold-deep" />
            Iniciar recuento
          </Link>
        </div>
      </div>
    </div>
  );
}
