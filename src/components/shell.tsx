"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
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

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!drawerOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [drawerOpen]);

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

      {/* =================== MÓVIL: Cabecera Estilo App =================== */}
      <header
        className="no-print sticky top-0 z-40 flex items-center justify-between border-b border-line bg-ink/95 px-4 py-2.5 backdrop-blur-md lg:hidden"
        style={{ paddingTop: "max(0.6rem, env(safe-area-inset-top))" }}
      >
        <Link href="/" className="flex items-center gap-2.5 active:scale-95 transition-transform">
          <LogoMark className="h-8 w-8 shrink-0" />
          <div>
            <span className="block font-display text-sm font-bold leading-none text-cream">
              Santa Bárbara
            </span>
            <span className="block text-[0.58rem] font-medium uppercase tracking-[0.16em] text-gold-soft/80 mt-0.5">
              Inventario
            </span>
          </div>
        </Link>
        <div className="flex items-center gap-1.5">
          <DarkModeToggle />
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl bg-white/10 text-cream transition active:scale-90"
            aria-label="Abrir menú"
          >
            <Menu className="h-4.5 w-4.5" />
          </button>
        </div>
      </header>

      {/* =================== MÓVIL: Menú deslizante =================== */}
      <AnimatePresence>
        {drawerOpen && (
          <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-ink/75 backdrop-blur-sm"
              onClick={() => setDrawerOpen(false)}
            />
            <motion.nav
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="absolute inset-y-0 right-0 flex w-[290px] flex-col overflow-y-auto border-l border-white/10 bg-ink px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))]"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <Link href="/" className="flex items-center gap-2.5" onClick={() => setDrawerOpen(false)}>
                  <LogoMark className="h-8 w-8" />
                  <LogoWord />
                </Link>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/10 text-cream/70 transition hover:text-cream"
                  aria-label="Cerrar menú"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="mt-6 px-2 text-[0.6rem] font-semibold uppercase tracking-[0.26em] text-gold-soft/70">
                Inventario Activo
              </p>
              <div className="mt-2 space-y-1">
                {NAV_MAIN.map(({ href, label, icon: Icon, badge }) => {
                  const active = isActive(pathname, href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setDrawerOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-medium transition active:scale-[0.98]",
                        active ? "bg-gold/20 text-gold-soft font-semibold" : "text-cream/70 hover:bg-white/5 hover:text-cream",
                      )}
                    >
                      <Icon className={cn("h-4.5 w-4.5 shrink-0", active ? "text-gold-soft" : "text-cream/40")} strokeWidth={1.8} />
                      <span className="flex-1">{label}</span>
                      {badge && (
                        <span className="rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 text-[0.52rem] font-bold uppercase text-gold-soft">
                          {badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>

              <p className="mt-6 border-t border-white/10 px-2 pt-5 text-[0.6rem] font-semibold uppercase tracking-[0.26em] text-gold-soft/70">
                Gestión Parroquial
              </p>
              <div className="mt-2 space-y-1">
                {NAV_MANAGEMENT.map(({ href, label, icon: Icon }) => {
                  const active = isActive(pathname, href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setDrawerOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-medium transition active:scale-[0.98]",
                        active ? "bg-gold/20 text-gold-soft font-semibold" : "text-cream/70 hover:bg-white/5 hover:text-cream",
                      )}
                    >
                      <Icon className={cn("h-4.5 w-4.5 shrink-0", active ? "text-gold-soft" : "text-cream/40")} strokeWidth={1.8} />
                      <span className="flex-1">{label}</span>
                    </Link>
                  );
                })}
              </div>

              <div className="mt-auto border-t border-white/10 pt-4 text-center">
                <p className="font-display text-xs text-cream/50 italic">
                  &ldquo;Bien ordenadas están las cosas de Dios.&rdquo;
                </p>
                <p className="mt-1 text-[0.6rem] uppercase tracking-wider text-gold-soft/60">
                  Parroquia Santa Bárbara
                </p>
              </div>
            </motion.nav>
          </div>
        )}
      </AnimatePresence>

      {/* =================== Contenido Principal =================== */}
      <main className="min-w-0 pb-28 lg:pb-0">{children}</main>

      {/* =================== MÓVIL: Barra Inferior Estilo App =================== */}
      <nav
        className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-line bg-cream/95 backdrop-blur-xl dark:bg-ink/95 dark:border-white/10 lg:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
        style={{ paddingBottom: "max(0.4rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto grid max-w-md grid-cols-5 items-center px-2 pt-1.5">
          {/* Panel */}
          <Link
            href="/"
            className="flex flex-col items-center gap-1 py-1 active:scale-95 transition-transform"
          >
            <span
              className={cn(
                "flex h-7 w-11 items-center justify-center rounded-full transition-all",
                isActive(pathname, "/") && pathname === "/" ? "bg-gold/20 text-gold-deep dark:text-gold-soft" : "text-ink-soft dark:text-cream/40",
              )}
            >
              <LayoutDashboard className="h-[1.15rem] w-[1.15rem]" strokeWidth={isActive(pathname, "/") && pathname === "/" ? 2.2 : 1.7} />
            </span>
            <span
              className={cn(
                "text-[0.62rem] font-semibold tracking-tight",
                isActive(pathname, "/") && pathname === "/" ? "text-gold-deep dark:text-gold-soft font-bold" : "text-ink-soft dark:text-cream/45",
              )}
            >
              Panel
            </span>
          </Link>

          {/* Inventario */}
          <Link
            href="/inventario"
            className="flex flex-col items-center gap-1 py-1 active:scale-95 transition-transform"
          >
            <span
              className={cn(
                "flex h-7 w-11 items-center justify-center rounded-full transition-all",
                isActive(pathname, "/inventario") ? "bg-gold/20 text-gold-deep dark:text-gold-soft" : "text-ink-soft dark:text-cream/40",
              )}
            >
              <Boxes className="h-[1.15rem] w-[1.15rem]" strokeWidth={isActive(pathname, "/inventario") ? 2.2 : 1.7} />
            </span>
            <span
              className={cn(
                "text-[0.62rem] font-semibold tracking-tight",
                isActive(pathname, "/inventario") ? "text-gold-deep dark:text-gold-soft font-bold" : "text-ink-soft dark:text-cream/45",
              )}
            >
              Inventario
            </span>
          </Link>

          {/* BOTÓN CENTRAL ELEVADO: ESCÁNER */}
          <Link
            href="/escaner"
            className="group relative -mt-5 flex flex-col items-center active:scale-90 transition-transform"
            aria-label="Abrir escáner QR"
          >
            <span className="flex h-13 w-13 items-center justify-center rounded-full bg-gradient-to-tr from-gold-deep via-gold to-gold-soft text-ink shadow-[0_6px_20px_rgba(166,124,45,0.45)] ring-4 ring-paper dark:ring-ink">
              <ScanLine className="h-6 w-6 stroke-[2.4]" />
            </span>
            <span className="mt-1 text-[0.6rem] font-bold text-gold-deep dark:text-gold-soft uppercase tracking-wider">
              Escanear
            </span>
          </Link>

          {/* Zonas */}
          <Link
            href="/zonas"
            className="flex flex-col items-center gap-1 py-1 active:scale-95 transition-transform"
          >
            <span
              className={cn(
                "flex h-7 w-11 items-center justify-center rounded-full transition-all",
                isActive(pathname, "/zonas") ? "bg-gold/20 text-gold-deep dark:text-gold-soft" : "text-ink-soft dark:text-cream/40",
              )}
            >
              <MapPinned className="h-[1.15rem] w-[1.15rem]" strokeWidth={isActive(pathname, "/zonas") ? 2.2 : 1.7} />
            </span>
            <span
              className={cn(
                "text-[0.62rem] font-semibold tracking-tight",
                isActive(pathname, "/zonas") ? "text-gold-deep dark:text-gold-soft font-bold" : "text-ink-soft dark:text-cream/45",
              )}
            >
              Zonas
            </span>
          </Link>

          {/* Recuento */}
          <Link
            href="/recuento"
            className="flex flex-col items-center gap-1 py-1 active:scale-95 transition-transform"
          >
            <span
              className={cn(
                "flex h-7 w-11 items-center justify-center rounded-full transition-all",
                isActive(pathname, "/recuento") ? "bg-gold/20 text-gold-deep dark:text-gold-soft" : "text-ink-soft dark:text-cream/40",
              )}
            >
              <Play className="h-[1.15rem] w-[1.15rem]" strokeWidth={isActive(pathname, "/recuento") ? 2.2 : 1.7} />
            </span>
            <span
              className={cn(
                "text-[0.62rem] font-semibold tracking-tight",
                isActive(pathname, "/recuento") ? "text-gold-deep dark:text-gold-soft font-bold" : "text-ink-soft dark:text-cream/45",
              )}
            >
              Recuento
            </span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
