"use client";
import { useState } from "react";
import { GripVertical, Star, Trash2 } from "lucide-react";
import { PhotoUploader } from "@/components/photo-uploader";
import { photoUrl } from "@/lib/utils";

export function PhotoGalleryUploader({ value, onChange }: { value: number[]; onChange: (ids: number[]) => void }) {
  const [newPhoto, setNewPhoto] = useState<number | null>(null);
  function uploaded(id: number | null) {
    setNewPhoto(null);
    if (id && !value.includes(id) && value.length < 12) onChange([...value, id]);
  }
  return (
    <div>
      {value.length > 0 && (
        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {value.map((id, index) => (
            <div key={id} className="group relative overflow-hidden rounded-xl border border-line bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl(id) ?? ""} alt={`Foto ${index + 1}`} className="aspect-[4/3] w-full object-cover" />
              <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-ink/70 px-2 py-1 text-[0.6rem] font-bold text-white backdrop-blur">
                {index === 0 ? <><Star className="h-2.5 w-2.5 fill-gold text-gold" />Principal</> : <><GripVertical className="h-2.5 w-2.5" />{index + 1}</>}
              </span>
              <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-black/70 to-transparent p-2 pt-8">
                {index > 0 && <button type="button" onClick={() => onChange([id, ...value.filter((x) => x !== id)])} className="cursor-pointer rounded-full bg-white px-2 py-1 text-[0.6rem] font-bold text-ink">Hacer principal</button>}
                <button type="button" onClick={() => onChange(value.filter((x) => x !== id))} className="cursor-pointer rounded-full bg-red-600 p-1.5 text-white" aria-label="Quitar foto"><Trash2 className="h-3 w-3" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      {value.length < 12 && <PhotoUploader value={newPhoto} onChange={uploaded} hint={`${value.length}/12 fotos · cámara o galería`} />}
      <p className="mt-2 text-[0.68rem] text-ink-faint">La primera foto es la principal. Puedes guardar hasta 12 vistas, inscripciones o detalles de conservación.</p>
    </div>
  );
}
