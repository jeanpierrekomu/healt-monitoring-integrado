// Datos de ejecución de simulaciones (mock). Se reemplaza por /simulations/{id}/runs en la API.
import { hashString, seeded } from "@/lib/utils";

export const SIM_STEPS = [
  { name: "Preparación", until: 15 },
  { name: "Datos simulados", until: 40 },
  { name: "Detección IA", until: 65 },
  { name: "Revisión del doctor", until: 100 },
  { name: "Informe", until: 101 },
];

export const SIM_COMPARISON: {
  metric: string;
  ia: number | string;
  doctor: number | string;
  decimals?: number;
  suffix?: string;
}[] = [
  { metric: "Tiempo de detección", ia: 2.1, doctor: 5.4, decimals: 1, suffix: " min" },
  { metric: "Severidad asignada", ia: "Crítico", doctor: "Crítico" },
  { metric: "Acción sugerida", ia: "Detener EVA", doctor: "Detener EVA" },
  { metric: "Falsos positivos", ia: 1, doctor: 0 },
  { metric: "Confianza media", ia: 0.91, doctor: "—", decimals: 2 },
];

/** Señal de HR de 60 minutos con un evento a partir del minuto 40. */
export function simulationSignal(id: string) {
  const r = seeded(hashString(id));
  const out: { min: number; hr: number }[] = [];
  let v = 92;
  for (let i = 0; i <= 120; i++) {
    const min = i / 2;
    const target = min < 40 ? 92 : 92 + Math.min(48, (min - 40) * 3.2);
    v = v + (target - v) * 0.3 + (r() - 0.5) * 6;
    out.push({ min, hr: Math.round(v) });
  }
  return out;
}
