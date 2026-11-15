"use client";

// Figura del cuerpo con los puntos donde más hueso se pierde en microgravedad.
// La NASA describe una pérdida de ~1–1,5 % de masa ósea por mes en los huesos que cargan peso (cadera, columna, piernas).
// El radio (donde mide la pulsera) pierde poco: se usa como indicador de tendencia.
import { motion } from "motion/react";
import { useState } from "react";
import type { Status } from "@/lib/types";
import { cn, STATUS_META } from "@/lib/utils";
import type { BoneHealth } from "@/services/bone";

interface Site {
  id: string;
  label: string;
  /** Pérdida típica por mes en microgravedad (%), valor medio de referencia. */
  monthly: number;
  ref: string;
  points: [number, number][];
  sensor?: boolean;
}

const SITES: Site[] = [
  { id: "hip", label: "Cadera (cuello del fémur)", monthly: 1.25, ref: "1–1,5 %/mes", points: [[92, 214], [128, 214]] },
  { id: "spine", label: "Columna lumbar", monthly: 1.0, ref: "~1 %/mes", points: [[110, 180]] },
  { id: "legs", label: "Piernas (tibia)", monthly: 0.8, ref: "hasta ~1 %/mes", points: [[96, 320], [124, 320]] },
  { id: "heel", label: "Talón (calcáneo)", monthly: 1.0, ref: "~1 %/mes", points: [[95, 398], [125, 398]] },
  { id: "radius", label: "Radio · aquí mide la pulsera", monthly: 0.35, ref: "baja", points: [[44, 238]], sensor: true },
];

function siteStatus(loss: number): Status {
  if (loss < 1.5) return "normal";
  if (loss < 3) return "atencion";
  if (loss < 4.5) return "advertencia";
  return "critico";
}

export function BoneSites({ bone }: { bone: BoneHealth }) {
  const [hover, setHover] = useState<string | null>(null);
  const months = bone.missionDay / 30;
  // Si pierde más rápido de lo esperado o hace poco ejercicio, la estimación de cada sitio sube.
  const factor = Math.max(0.7, Math.min(2.5, bone.ratio));
  const rows = SITES.map((s) => {
    const loss = s.sensor ? Math.abs(bone.changePct) : s.monthly * months * factor;
    return { ...s, loss, status: s.sensor ? bone.status : siteStatus(loss) };
  });

  return (
    <div className="grid grid-cols-[150px_minmax(0,1fr)] items-center gap-4">
      <svg viewBox="0 0 220 420" className="w-full" role="img" aria-label="Puntos del esqueleto con más pérdida ósea">
        <defs>
          <linearGradient id="silhouette" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4fc3ff" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#4fc3ff" stopOpacity="0.08" />
          </linearGradient>
        </defs>
        {/* Silueta */}
        <g fill="url(#silhouette)" stroke="#4fc3ff" strokeOpacity="0.45" strokeWidth="1.5">
          <circle cx="110" cy="34" r="22" />
          <path d="M98 56 h24 v12 h-24z" />
          <path d="M70 72 Q110 62 150 72 L156 150 Q150 200 140 214 L80 214 Q70 200 64 150 Z" />
          <path d="M70 76 L44 150 L36 236 L50 238 L62 160 L80 110 Z" />
          <path d="M150 76 L176 150 L184 236 L170 238 L158 160 L140 110 Z" />
          <path d="M80 210 L140 210 L134 290 L130 400 L116 404 L112 300 L108 300 L104 404 L90 400 L86 290 Z" />
        </g>
        {/* Columna */}
        <line x1="110" y1="70" x2="110" y2="206" stroke="#f3e6c8" strokeOpacity="0.5" strokeDasharray="3 4" />
        {/* Pulsera */}
        <rect x="32" y="226" width="22" height="9" rx="3" fill="#4f8cff" />
        {rows.map((r) =>
          r.points.map(([x, y], i) => {
            const color = STATUS_META[r.status].hex;
            const active = hover === r.id;
            return (
              <g key={r.id + i} onMouseEnter={() => setHover(r.id)} onMouseLeave={() => setHover(null)} className="cursor-help">
                <motion.circle
                  cx={x}
                  cy={y}
                  fill={color}
                  initial={{ r: 0, opacity: 0.5 }}
                  animate={{ r: [7, 15, 7], opacity: [0.45, 0, 0.45] }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                />
                <circle cx={x} cy={y} r={active ? 7 : 5.5} fill={color} stroke="#081220" strokeWidth="2" />
              </g>
            );
          }),
        )}
      </svg>

      <div className="flex flex-col gap-1.5">
        <p className="text-[11px] font-semibold tracking-wider text-muted">PUNTOS MÁS AFECTADOS · PÉRDIDA ESTIMADA</p>
        {rows.map((r) => {
          const color = STATUS_META[r.status].hex;
          return (
            <div
              key={r.id}
              onMouseEnter={() => setHover(r.id)}
              onMouseLeave={() => setHover(null)}
              className={cn("flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors", hover === r.id && "bg-surface-2")}
            >
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold">{r.label}</p>
                <p className="text-[10px] text-muted">Referencia en el espacio: {r.ref}</p>
              </div>
              <span className="text-sm font-bold tabular-nums" style={{ color }}>
                −{r.loss.toFixed(1)} %
              </span>
            </div>
          );
        })}
        <p className="pt-1 text-[10px] leading-relaxed text-muted">
          Estimación con los días en microgravedad y el ritmo medido por la pulsera. La NASA reporta ~1–1,5 % de pérdida por mes en huesos que
          cargan peso.
        </p>
      </div>
    </div>
  );
}
