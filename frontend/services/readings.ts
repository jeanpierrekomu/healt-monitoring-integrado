// Lecturas de signos vitales. En modo mock se generan series realistas
// (deterministas al inicio para que servidor y cliente coincidan, aleatorias en vivo).
import type { Astronaut, VitalConfig, VitalKey } from "@/lib/types";
import { hashString, seeded } from "@/lib/utils";
import { vitalConfigs } from "./mock/data";

export function getVitalConfigs(): VitalConfig[] {
  return vitalConfigs;
}

export function vitalConfig(key: VitalKey): VitalConfig {
  return vitalConfigs.find((v) => v.key === key)!;
}

const AMP: Record<VitalKey, number> = { hr: 2.6, hrv: 2.4, spo2: 0.35, temp: 0.04 };

export function vitalProfile(a: Astronaut, key: VitalKey) {
  return { base: a.vitals[key], amp: AMP[key] };
}

/** Paso de una caminata aleatoria con retorno a la media: sube y baja como una señal real. */
export function nextReading(prev: number, base: number, amp: number, rand: () => number = Math.random) {
  const spike = rand() < 0.04 ? (rand() - 0.3) * amp * 6 : 0;
  return prev + (base - prev) * 0.18 + (rand() - 0.5) * amp * 2 + spike;
}

export function initialSeries(seedKey: string, base: number, amp: number, n: number) {
  const rand = seeded(hashString(seedKey));
  const out: number[] = [];
  let v = base;
  for (let i = 0; i < n; i++) {
    v = nextReading(v, base, amp, rand);
    out.push(v);
  }
  return out;
}

/** Histórico diario (7 días, 4 muestras por día) para el perfil. */
export function weeklySeries(a: Astronaut) {
  const rand = seeded(hashString(a.id + "week"));
  const ref = 74;
  const out: { label: string; hr: number; ref: number }[] = [];
  const days = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Hoy"];
  let v = ref + (a.vitals.hr - ref) * 0.2;
  for (let i = 0; i < 28; i++) {
    const target = ref + (a.vitals.hr - ref) * Math.pow(i / 27, 3);
    v = v + (target - v) * 0.35 + (rand() - 0.5) * 5;
    out.push({ label: days[Math.floor(i / 4)], hr: Math.round(v), ref: Math.round(ref + (rand() - 0.5) * 3) });
  }
  return out;
}
