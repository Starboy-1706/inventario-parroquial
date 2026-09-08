"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  BarChart3,
  Boxes,
  HelpCircle,
  LayoutDashboard,
  MapPinned,
  Menu,
  Play,
  ScanLine,
  Settings,
  ShieldCheck,
  X,
  type LucideIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { LogoMark, LogoWord } from "@/components/logo";
import { DarkModeToggle } from "@/components/dark-mode-toggle";

const NAV_MAIN: { href: string; label: string; icon: LucideIcon; badge?: string }[] = [
  { href: "/", label: "Panel", icon: LayoutDashboard },
  { href: "/inventario", label: "Inventario", icon: Boxes },
  { href: "/recuento", label: "Modo Recuento", icon: Play, badge: "Anual" },
  { href: "/zonas", label: "Zonas", icon: MapPinned },
  { href: "/escaner", label: "Escáner", icon: ScanLine, badge: "En vivo" },
];

const NAV_MANAGEMENT: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/informes", label: "Informes y Balances", icon: BarChart3 },
  { href: "/ajustes", label: "Ajustes de Parroquia", icon: Settings },
  { href: "/ayuda", label: "Guía y Manual", icon: HelpCircle },
  { href: "/seguridad", label: "Seguridad y Copias", icon: ShieldCheck },
];

const NAV_MOBILE: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Panel", icon: LayoutDashboard },
  { href: "/inventario", label: "Inventario", icon: Boxes },
  { href: "/recuento", label: "Recuento", icon: Play },
  { href: "/zonas", label: "Zonas", icon: MapPinned },
  { href: "/escaner", label: "Escáner", icon: ScanLine },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Cerrar el menú al cambiar de ruta: se hace sin setState en efecto
  // porque los Link dentro del drawer ya cierran el menú al hacer clic.
  if (pathname === "/acceso") return <>{children}</>;

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[17.5rem_1fr]">
      {/* =================== ESCRITORIO: Barra lateral =================== */}
      <aside className="no-print sticky top-0 hidden h-dvh flex-col justify-between overflow-y-auto border-r border-white/5 bg-ink px-6 py-8 lg:flex">
        <div>
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <LogoMark className="h-10 w-10" />
              <LogoWord />
            </Link>
            <DarkModeToggle />
          </div>

          <div className="mt-8 border-t border-white/10 pt-6">
            <p className="px-3 text-[0.6rem] font-semibold uppercase tracking-[0.26em] text-cream/35">
              Inventario Activo
            </p>
            <nav className="mt-2.5 space-y-1">
              {NAV_MAIN.map(({ href, label, icon: Icon, badge }) => {
                const active = isActive(pathname, href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-300",
                      active ? "bg-white/8 text-cream" : "text-cream/55 hover:bg-white/5 hover:text-cream",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-gold-soft transition-all duration-300",
                        active ? "opacity-100" : "opacity-0 group-hover:opacity-40",
                      )}
                    />
                    <Icon
                      className={cn(
                        "h-[1.05rem] w-[1.05rem] transition-colors",
                        active ? "text-gold-soft" : "text-cream/40 group-hover:text-cream/70",
                      )}
                      strokeWidth={1.8}
                    />
                    <span>{label}</span>
                    {badge && (
                      <span className="ml-auto rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-wider text-gold-soft">
                        {badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="mt-6 border-t border-white/10 pt-5">
            <p className="px-3 text-[0.6rem] font-semibold uppercase tracking-[0.26em] text-cream/35">
              Gestión Parroquial
            </p>
            <nav className="mt-2.5 space-y-1">
              {NAV_MANAGEMENT.map(({ href, label, icon: Icon }) => {
                const active = isActive(pathname, href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-300",
                      active ? "bg-white/8 text-cream" : "text-cream/55 hover:bg-white/5 hover:text-cream",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-gold-soft transition-all duration-300",
                        active ? "opacity-100" : "opacity-0 group-hover:opacity-40",
                      )}
                    />
                    <Icon
                      className={cn(
                        "h-[1.05rem] w-[1.05rem] transition-colors",
                        active ? "text-gold-soft" : "text-cream/40 group-hover:text-cream/70",
                      )}
                      strokeWidth={1.8}
                    />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-gold-soft/80">
            Parroquia Santa Bárbara
          </p>
          <p className="mt-1 font-display text-xs italic leading-snug text-cream/70">
            &ldquo;Bien ordenadas están las cosas de Dios.&rdquo;
          </p>
        </div>
      </aside>

      {/* =================== MÓVIL: Cabecera =================== */}
      <header
        className="no-print sticky top-0 z-40 flex items-center justify-between border-b border-white/10 bg-ink px-4 py-3 lg:hidden"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <Link href="/" className="flex items-center gap-2">
          <LogoMark className="h-7 w-7" />
          <span className="font-display text-sm font-bold text-cream">Santa Bárbara</span>
        </Link>
        <div className="flex items-center gap-1">
          <DarkModeToggle />
          <Link
            href="/escaner"
            className="flex items-center gap-1.5 rounded-full bg-gold px-3 py-1.5 text-xs font-bold text-ink shadow-lift"
          >
            <ScanLine className="h-3.5 w-3.5" strokeWidth={2.2} />
            Escanear
          </Link>
          <button
            onClick={() => setDrawerOpen(true)}
            className="cursor-pointer rounded-full p-2 text-cream/70 transition hover:bg-white/10 hover:text-cream"
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* =================== MÓVIL: Menú deslizante =================== */}
      <AnimatePresence>
        {drawerOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal>
          <div
            className="absolute inset-0 bg-ink/70 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <motion.nav
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="absolute inset-y-0 right-0 flex w-[280px] flex-col overflow-y-auto border-l border-white/10 bg-ink px-5 pb-[env(safe-area-inset-bottom)] pt-[max(1.5rem,env(safe-area-inset-top))]"
          >
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2" onClick={() => setDrawerOpen(false)}>
                <LogoMark className="h-8 w-8" />
                <LogoWord />
              </Link>
              <button
                onClick={() => setDrawerOpen(false)}
                className="cursor-pointer rounded-full p-2 text-cream/60 transition hover:bg-white/10"
                aria-label="Cerrar menú"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-8 px-2 text-[0.6rem] font-semibold uppercase tracking-[0.26em] text-cream/35">
              Inventario Activo
            </p>
            <nav className="mt-2 space-y-0.5">
              {NAV_MAIN.map(({ href, label, icon: Icon, badge }) => {
                const active = isActive(pathname, href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition",
                      active ? "bg-gold/15 text-gold-soft" : "text-cream/60 hover:bg-white/5 hover:text-cream",
                    )}
                  >
                    <Icon className="h-[1.1rem] w-[1.1rem]" strokeWidth={1.8} />
                    <span className="flex-1">{label}</span>
                    {badge && (
                      <span className="rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 text-[0.5rem] font-bold uppercase text-gold-soft">
                        {badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            <p className="mt-6 border-t border-white/10 px-2 pt-4 text-[0.6rem] font-semibold uppercase tracking-[0.26em] text-cream/35">
              Gestión Parroquial
            </p>
            <nav className="mt-2 space-y-0.5">
              {NAV_MANAGEMENT.map(({ href, label, icon: Icon }) => {
                const active = isActive(pathname, href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition",
                      active ? "bg-gold/15 text-gold-soft" : "text-cream/60 hover:bg-white/5 hover:text-cream",
                    )}
                  >
                    <Icon className="h-[1.1rem] w-[1.1rem]" strokeWidth={1.8} />
                    <span className="flex-1">{label}</span>
                  </Link>
                );
              })}
            </nav>

            <p className="mt-auto pb-4 pt-8 text-center text-[0.6rem] text-cream/30">
              Parroquia Santa Bárbara
            </p>
          </motion.nav>
        </div>
        )}
      </AnimatePresence>

      {/* =================== Contenido =================== */}
      <main className="min-w-0 pb-24 lg:pb-0">{children}</main>

      {/* =================== MÓVIL: Barra inferior =================== */}
      <nav
        className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-ink/97 backdrop-blur-lg lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto grid max-w-md grid-cols-5 px-1">
          {NAV_MOBILE.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center gap-0.5 py-2"
              >
                <span
                  className={cn(
                    "flex h-8 w-14 items-center justify-center rounded-full transition-all duration-300",
                    active ? "scale-105 bg-gold/25" : "bg-transparent",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-[1.15rem] w-[1.15rem] transition-colors",
                      active ? "text-gold-soft" : "text-cream/40",
                    )}
                    strokeWidth={active ? 2.2 : 1.7}
                  />
                </span>
                <span
                  className={cn(
                    "text-[0.56rem] font-medium tracking-tight",
                    active ? "font-bold text-gold-soft" : "text-cream/45",
                  )}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
