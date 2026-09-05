"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw, Trash2 } from "lucide-react";
import { secureFetch } from "@/lib/secure-fetch";
import { Button, Modal, inputCls } from "@/components/ui";

export function TrashActions({ id, code }: { id: number; code: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"restore" | "delete" | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function execute() {
    if (confirmation.trim().toUpperCase() !== code) return;
    setPending(true); setError(null);
    const res = await secureFetch(`/api/items/${id}/trash`, {
      method: mode === "restore" ? "POST" : "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmationCode: code }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setError(data.error ?? "No se pudo completar la operación."); setPending(false); return; }
    setMode(null); router.refresh();
  }

  return (
    <>
      <div className="mt-3 flex gap-2 sm:mt-0">
        <Button size="sm" variant="outline" onClick={() => { setMode("restore"); setConfirmation(""); }}><RotateCcw className="h-3.5 w-3.5" />Restaurar</Button>
        <Button size="sm" variant="danger" onClick={() => { setMode("delete"); setConfirmation(""); }}><Trash2 className="h-3.5 w-3.5" />Borrar</Button>
      </div>
      <Modal open={mode !== null} onClose={() => setMode(null)} title={mode === "restore" ? "Restaurar artículo" : "Borrado definitivo"} subtitle={`Confirma escribiendo ${code}`}>
        <p className="text-sm text-ink-soft">{mode === "restore" ? "El artículo volverá al inventario activo." : "Esta acción borrará definitivamente la ficha y su historial. No puede deshacerse."}</p>
        <input value={confirmation} onChange={(e) => setConfirmation(e.target.value.toUpperCase())} placeholder={code} className={`${inputCls} mt-4 text-center font-mono font-bold tracking-widest`} />
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
        <div className="mt-5 flex justify-end gap-2"><Button variant="ghost" onClick={() => setMode(null)}>Cancelar</Button><Button variant={mode === "delete" ? "danger" : "dark"} disabled={pending || confirmation.trim() !== code} onClick={() => void execute()}>{pending && <Loader2 className="h-4 w-4 animate-spin" />}{mode === "restore" ? "Restaurar" : "Eliminar definitivamente"}</Button></div>
      </Modal>
    </>
  );
}
