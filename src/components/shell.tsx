"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  LayoutDashboard,
  Boxes,
  MapPinned,
  ScanLine,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoMark, LogoWord } from "@/components/logo";

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Panel", icon: LayoutDashboard },
  { href: "/inventario", label: "Inventario", icon: Boxes },
  { href: "/zonas", label: "Zonas", icon: MapPinned },
  { href: "/escaner", label: "Escáner", icon: ScanLine },
  { href: "/seguridad", label: "Seguridad", icon: ShieldCheck },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[17.5rem_1fr]">
      {/* ---------- Barra lateral (escritorio) ---------- */}
      <aside className="no-print sticky top-0 hidden h-dvh flex-col justify-between border-r border-white/5 bg-ink px-6 py-8 lg:flex">
        <div>
          <Link href="/" className="flex items-center gap-3">
            <LogoMark className="h-10 w-10" />
            <LogoWord />
          </Link>

          <div className="mt-10 border-t border-white/10 pt-8">
            <p className="px-3 text-[0.6rem] font-semibold uppercase tracking-[0.26em] text-cream/35">
              Navegación
            </p>
            <nav className="mt-3 space-y-1">
              {NAV.map(({ href, label, icon: Icon }) => {
                const active = isActive(pathname, href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300",
                      active
                        ? "bg-white/8 text-cream"
                        : "text-cream/50 hover:bg-white/5 hover:text-cream",
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
                    {label}
                    {href === "/escaner" && (
                      <span className="ml-auto rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 text-[0.58rem] font-semibold uppercase tracking-wider text-gold-soft">
                        En vivo
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-gold-soft/80">
            Casa de todos
          </p>
          <p className="mt-1.5 font-display text-sm italic leading-snug text-cream/70">
            “Bien ordenadas están las cosas de Dios.”
          </p>
        </div>
      </aside>

      {/* ---------- Cabecera móvil ---------- */}
      <header className="no-print sticky top-0 z-40 flex items-center justify-between border-b border-line bg-ink px-5 py-3.5 lg:hidden">
        <Link href="/" className="flex items-center gap-2.5">
          <LogoMark className="h-8 w-8" />
          <LogoWord />
        </Link>
        <Link
          href="/escaner"
          className="flex items-center gap-2 rounded-full bg-gold px-3.5 py-2 text-xs font-semibold text-ink shadow-lift transition-transform active:scale-95"
        >
          <ScanLine className="h-3.5 w-3.5" strokeWidth={2.2} />
          Escanear
        </Link>
      </header>

      {/* ---------- Contenido ---------- */}
      <main className="min-w-0 pb-28 lg:pb-0">{children}</main>

      {/* ---------- Barra de navegación inferior (móvil) ---------- */}
      <nav className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-ink/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 px-2">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center gap-1 py-2.5"
              >
                <span
                  className={cn(
                    "flex h-8 w-14 items-center justify-center rounded-full transition-colors duration-300",
                    active ? "bg-gold/20" : "bg-transparent",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-[1.15rem] w-[1.15rem]",
                      active ? "text-gold-soft" : "text-cream/40",
                    )}
                    strokeWidth={active ? 2 : 1.7}
                  />
                </span>
                <span
                  className={cn(
                    "text-[0.6rem] font-medium tracking-wide",
                    active ? "text-gold-soft" : "text-cream/40",
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
