"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

function getInitialTheme(): boolean {
  if (typeof window === "undefined") return false;
  return (
    localStorage.getItem("theme_mode") === "dark" ||
    (!localStorage.getItem("theme_mode") &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)
  );
}

export function DarkModeToggle({ className }: { className?: string }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const isDark = getInitialTheme();
    // Aplicar clase al DOM al montar sin provocar cascading render
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    setDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme_mode", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme_mode", "light");
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`inline-flex cursor-pointer items-center justify-center rounded-xl p-2 text-cream/60 transition hover:bg-white/10 hover:text-cream ${
        className ?? ""
      }`}
      aria-label={dark ? "Activar modo claro" : "Activar modo oscuro"}
      title={dark ? "Modo claro (Papel cálido)" : "Modo oscuro (Basílica nocturna)"}
    >
      {dark ? <Sun className="h-4 w-4 text-gold-soft" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
