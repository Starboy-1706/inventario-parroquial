import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "@/components/login-form";
import { getAuthConfig } from "@/lib/auth-token";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Acceso restringido" },
  description: "Área privada.",
  robots: { index: false, follow: false },
};

export default function AccesoPage() {
  return (
    <Suspense>
      <LoginForm configured={getAuthConfig().valid} />
    </Suspense>
  );
}
