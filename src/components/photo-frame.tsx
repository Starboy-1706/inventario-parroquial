import type { ReactNode } from "react";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Marco fotográfico adaptable:
 * - La imagen principal usa object-contain: nunca se recorta ni deforma.
 * - Una copia ampliada y difuminada rellena el fondo sin dejar franjas vacías.
 * - Funciona con fotos verticales, horizontales y cuadradas.
 */
export function PhotoFrame({
  src,
  alt,
  aspect = "landscape",
  className,
  imageClassName,
  overlay,
  priority = false,
}: {
  src?: string | null;
  alt: string;
  aspect?: "landscape" | "standard" | "square" | "wide";
  className?: string;
  imageClassName?: string;
  overlay?: ReactNode;
  priority?: boolean;
}) {
  const aspectClass = {
    landscape: "aspect-[16/10]",
    standard: "aspect-[4/3]",
    square: "aspect-square",
    wide: "aspect-[16/9]",
  }[aspect];

  if (!src) {
    return (
      <div
        className={cn(
          "relative flex items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_35%_25%,rgba(166,124,45,.18),transparent_42%),linear-gradient(145deg,#eee7d7,#dfd4bb)]",
          aspectClass,
          className,
        )}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/60 bg-white/45 text-gold-deep shadow-sm backdrop-blur-sm">
          <ImageIcon className="h-5 w-5" strokeWidth={1.5} />
        </span>
        {overlay}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden bg-stone-900",
        aspectClass,
        className,
      )}
    >
      {/* Fondo ambiental: llena el marco sin imponer recorte a la foto real. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        aria-hidden="true"
        className="absolute -inset-3 h-[calc(100%+1.5rem)] w-[calc(100%+1.5rem)] scale-110 object-cover opacity-55 blur-xl saturate-75"
      />
      <span className="absolute inset-0 bg-ink/20" aria-hidden="true" />

      {/* Imagen completa y nítida. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        className={cn(
          "relative z-[1] h-full w-full object-contain drop-shadow-[0_8px_18px_rgba(0,0,0,.28)] transition-transform duration-500",
          imageClassName,
        )}
      />
      <span
        className="pointer-events-none absolute inset-0 z-[2] ring-1 ring-inset ring-white/10"
        aria-hidden="true"
      />
      {overlay && <div className="absolute inset-0 z-[3]">{overlay}</div>}
    </div>
  );
}
