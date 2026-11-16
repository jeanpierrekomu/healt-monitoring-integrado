"use client";

// Fotos reales del prototipo: la foto grande del prototipo físico y la galería de la construcción.
import { Camera, ImageIcon, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Panel } from "@/components/ground/ui";
import { BUILD_PHOTOS, PROTOTYPE_PHOTO, type HardwarePhoto } from "@/lib/ground/hardware-photos";

const PLACEHOLDER_STEPS = ["Diseño", "Componentes", "Soldadura", "Pruebas", "Carcasa", "Resultado"];

function Pending({ label, big = false }: { label: string; big?: boolean }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-surface/40 text-center ${big ? "aspect-[16/9]" : "aspect-[4/3]"}`}>
      <ImageIcon className={big ? "size-8 text-muted" : "size-5 text-muted"} />
      <p className={big ? "text-[14px] font-semibold" : "text-[13px] font-semibold"}>{label}</p>
      <p className="text-xs text-muted">Foto pendiente</p>
    </div>
  );
}

export function HardwarePhotos() {
  const [open, setOpen] = useState<HardwarePhoto | null>(null);
  return (
    <div className="flex flex-col gap-4">
      <Panel title="Prototipo físico" subtitle="AZRIEL terminado" right={<Camera className="size-4 text-muted" />}>
        {PROTOTYPE_PHOTO ? (
          <>
          <button type="button" onClick={() => setOpen(PROTOTYPE_PHOTO)} className="relative block w-full overflow-hidden rounded-lg bg-black">
            {/* Fondo desenfocado con la misma foto, para que la foto vertical llene el panel */}
            {/* eslint-disable-next-line @next/next/no-img-element -- fotos locales del prototipo */}
            <img src={PROTOTYPE_PHOTO.src} alt="" aria-hidden className="absolute inset-0 size-full scale-110 object-cover opacity-40 blur-2xl" />
            {/* eslint-disable-next-line @next/next/no-img-element -- fotos locales del prototipo */}
            <img src={PROTOTYPE_PHOTO.src} alt={PROTOTYPE_PHOTO.caption} className="relative mx-auto max-h-[72vh] w-auto object-contain" />
          </button>
          <p className="mt-2 text-[13px] text-muted">{PROTOTYPE_PHOTO.caption}</p>
          </>
        ) : (
          <Pending label="Foto del prototipo final" big />
        )}
      </Panel>
      <Panel title="Construcción" subtitle="El proceso, paso a paso">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
          {BUILD_PHOTOS.length
            ? BUILD_PHOTOS.map((p, i) => (
                <button key={p.src} type="button" onClick={() => setOpen(p)} className="group text-left">
                  <span className="block overflow-hidden rounded-lg">
                    {/* eslint-disable-next-line @next/next/no-img-element -- fotos locales del prototipo */}
                    <img src={p.src} alt={p.caption} className="aspect-[3/4] w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                  </span>
                  <span className="mt-1.5 flex gap-2 text-xs">
                    <span className="font-mono text-cyan-300">{String(i + 1).padStart(2, "0")}</span>
                    <span className="text-muted">{p.caption}</span>
                  </span>
                </button>
              ))
            : PLACEHOLDER_STEPS.map((s) => <Pending key={s} label={s} />)}
        </div>
      </Panel>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(null)} className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-6">
            <button type="button" onClick={() => setOpen(null)} className="absolute top-4 right-4 text-white/80 hover:text-white" aria-label="Cerrar"><X className="size-6" /></button>
            <figure onClick={(e) => e.stopPropagation()} className="max-h-full max-w-5xl">
              {/* eslint-disable-next-line @next/next/no-img-element -- fotos locales del prototipo */}
              <img src={open.src} alt={open.caption} className="max-h-[80vh] w-auto rounded-lg object-contain" />
              <figcaption className="mt-2 text-center text-[13px] text-white/80">{open.caption}</figcaption>
            </figure>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
