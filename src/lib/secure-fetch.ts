"use client";

/**
 * fetch para operaciones privadas. Si la sesión caduca, redirige de forma
 * inmediata a la ventana previa de acceso conservando la ruta actual.
 */
export async function secureFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const response = await fetch(input, init);
  if (response.status === 401 && typeof window !== "undefined") {
    const next = `${window.location.pathname}${window.location.search}`;
    window.location.assign(`/acceso?next=${encodeURIComponent(next)}`);
  }
  return response;
}
