"use client";

// Figura animada: cómo mide la pulsera la velocidad del sonido (SOS) a lo largo del radio.
// Un emisor manda un pulso; el pulso viaja más rápido por el hueso y llega primero a R1 y luego a R2.
// SOS = distancia entre receptores ÷ diferencia de tiempos de llegada.
import { motion, useReducedMotion } from "motion/react";

const BONE = "#f3e6c8";

export function UltrasoundFigure({ sos, color }: { sos: number; color: string }) {
  const reduced = useReducedMotion() ?? false;
  const d = 1.5; // cm entre receptores
  const dtUs = ((d / 100) / sos) * 1e6; // µs
  const loop = { duration: 2.6, repeat: Infinity, ease: "linear" as const, repeatDelay: 0.4 };

  return (
    <figure className="flex flex-col gap-2">
      <svg viewBox="0 0 560 230" className="w-full" role="img" aria-label="Pulsera con ultrasonido midiendo la velocidad del sonido en el radio">
        <defs>
          <linearGradient id="skin" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1d2b46" />
            <stop offset="100%" stopColor="#121c30" />
          </linearGradient>
          <radialGradient id="pulse" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={color} stopOpacity="1" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </radialGradient>
          <pattern id="porous" width="9" height="9" patternUnits="userSpaceOnUse">
            <circle cx="4.5" cy="4.5" r="1.4" fill="#cdbb93" opacity="0.6" />
          </pattern>
        </defs>

        {/* Antebrazo (piel y músculo) */}
        <rect x="20" y="70" width="520" height="120" rx="58" fill="url(#skin)" stroke="#2c3b5a" />
        <text x="36" y="182" fill="#8A97AD" fontSize="11">Piel y músculo · ~1540 m/s</text>

        {/* Radio: capa cortical (dura) + interior esponjoso */}
        <rect x="40" y="112" width="480" height="36" rx="18" fill={BONE} />
        <rect x="48" y="120" width="464" height="20" rx="10" fill="url(#porous)" />
        <text x="516" y="166" textAnchor="end" fill="#cdbb93" fontSize="11">Radio · hueso cortical ~3500–4200 m/s</text>

        {/* Pulsera con 3 transductores */}
        <rect x="150" y="40" width="300" height="34" rx="10" fill="#0b1426" stroke="#4f8cff" strokeWidth="1.5" />
        {[
          { x: 185, label: "E", sub: "Emisor" },
          { x: 300, label: "R1", sub: "Receptor 1" },
          { x: 390, label: "R2", sub: "Receptor 2" },
        ].map((t) => (
          <g key={t.label}>
            <rect x={t.x - 16} y={64} width={32} height={14} rx={3} fill="#4f8cff" />
            <text x={t.x} y={56} textAnchor="middle" fill="#E6EDF7" fontSize="12" fontWeight="700">
              {t.label}
            </text>
            <text x={t.x} y={28} textAnchor="middle" fill="#8A97AD" fontSize="10">
              {t.sub}
            </text>
          </g>
        ))}
        <text x="455" y="61" fill="#8A97AD" fontSize="10">gel / silicona</text>

        {/* Distancia entre receptores */}
        <line x1="300" y1="92" x2="390" y2="92" stroke="#8A97AD" strokeDasharray="3 3" />
        <text x="345" y="88" textAnchor="middle" fill="#8A97AD" fontSize="10">
          d = {d} cm
        </text>

        {/* Recorrido del pulso: baja al hueso, viaja por la corteza y sube a cada receptor */}
        <path d="M185 78 L195 118 L300 118 L300 78 M300 118 L390 118 L390 78" fill="none" stroke={color} strokeOpacity="0.35" strokeWidth="2" strokeDasharray="5 4" />
        {!reduced && (
          <>
            <motion.circle
              r="9"
              fill="url(#pulse)"
              animate={{ cx: [185, 195, 300, 390, 390], cy: [78, 118, 118, 118, 78] }}
              transition={{ ...loop, times: [0, 0.15, 0.55, 0.85, 1] }}
            />
            {[300, 390].map((x, i) => (
              <motion.circle
                key={x}
                cx={x}
                cy={78}
                fill="none"
                stroke={color}
                strokeWidth="2"
                animate={{ r: [0, 0, 14, 0], opacity: [0, 0, 0.9, 0] }}
                transition={{ ...loop, times: i === 0 ? [0, 0.5, 0.62, 0.7] : [0, 0.88, 0.96, 1] }}
              />
            ))}
          </>
        )}

        {/* Fórmula */}
        <rect x="20" y="200" width="520" height="26" rx="8" fill="#0b1426" />
        <text x="280" y="218" textAnchor="middle" fill="#E6EDF7" fontSize="12" fontWeight="600">
          SOS = d ÷ Δt = {d} cm ÷ {dtUs.toFixed(2)} µs ≈ {sos.toLocaleString("es")} m/s
        </text>
      </svg>
      <figcaption className="text-[11px] leading-relaxed text-muted">
        El pulso llega primero a R1 y luego a R2. Con dos receptores se cancela el efecto de la piel y los fluidos. Si el hueso pierde
        mineral, se vuelve más poroso y el sonido viaja más lento: la SOS baja.
      </figcaption>
    </figure>
  );
}
