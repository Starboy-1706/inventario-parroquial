import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import { Shell } from "@/components/shell";
import { isAuthorizedIp } from "@/lib/access";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  style: ["normal", "italic"],
  axes: ["opsz"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  // Título raíz neutro: en páginas bloqueadas por la lista blanca lo único
  // visible en la pestaña del navegador es "404".
  title: {
    default: "404",
    template: "%s · Sacristía Digital",
  },
  // Aplicación privada: nunca indexable
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#211c12",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  // ─── Lista blanca por IP (servidor) ────────────────────────────────
  // Un visitante no autorizado recibe una página completamente vacía:
  // ni HTML de la app, ni navegación, ni JavaScript. No hay nada que
  // pueda manipularse desde la consola del navegador.
  let allowed = false;
  try {
    allowed = await isAuthorizedIp();
  } catch {
    allowed = false;
  }

  if (!allowed) {
    return (
      <html lang="es">
        <body style={{ margin: 0, backgroundColor: "#ffffff", color: "#ffffff" }}>
          {/* Intencionadamente vacío: ni interfaz, ni datos, ni branding */}
        </body>
      </html>
    );
  }

  return (
    <html lang="es">
      <body
        className={`${inter.variable} ${fraunces.variable} ${jetbrains.variable} bg-paper text-ink antialiased`}
      >
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
