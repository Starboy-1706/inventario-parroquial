import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import { Shell } from "@/components/shell";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  style: ["normal", "italic"],
  axes: ["opsz"],
});

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  title: {
    default: "Parroquia Santa Bárbara · Inventario",
    template: "%s · Parroquia Santa Bárbara",
  },
  description: "Gestión privada del inventario de la Parroquia Santa Bárbara.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon.svg",
    apple: "/icons/icon.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Santa Bárbara",
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#211c12",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body className={`${inter.variable} ${fraunces.variable} ${jetbrains.variable} bg-paper text-ink antialiased`}>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
