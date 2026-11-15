// Salud ósea estimada con la pulsera: velocidad del sonido (SOS) a lo largo del radio.
// Cuando el hueso pierde mineral, el ultrasonido viaja más lento. Se compara siempre contra el valor
// de cada astronauta antes del vuelo y contra la pérdida esperada por los días en microgravedad.
import type { Status } from "@/lib/types";
import { hashString, seeded } from "@/lib/utils";
import { apiGet, USE_MOCK } from "./api";
import { boneProfiles, EXPECTED_DAILY_PCT, MISSION_DAY, MISSION_DAYS, type BoneProfile } from "./mock/bone";

export interface BoneHealth extends BoneProfile {
  sos: number;
  missionDay: number;
  expectedPct: number;
  /** Cuántas veces más rápido pierde hueso que lo esperado. */
  ratio: number;
  status: Status;
  /** Índice de salud ósea estimado 0–100 (100 = sin pérdida). */
  index: number;
  projectedEndPct: number;
  history: { label: string; medido: number; esperado: number }[];
  factors: { label: string; weight: number; detail: string }[];
}

export function boneStatus(ratio: number): Status {
  if (ratio <= 1.25) return "normal";
  if (ratio <= 1.75) return "atencion";
  if (ratio <= 2.5) return "advertencia";
  return "critico";
}

function build(p: BoneProfile): BoneHealth {
  const expectedPct = EXPECTED_DAILY_PCT * MISSION_DAY;
  const ratio = p.changePct / expectedPct;
  const rate = p.changePct / MISSION_DAY;
  const rand = seeded(hashString(p.astronautId + "bone"));
  const history: BoneHealth["history"] = [];
  for (let d = -7; d <= MISSION_DAY; d += 1) {
    const trend = d <= 0 ? 0 : rate * d;
    const noise = (rand() - 0.5) * 0.18;
    history.push({ label: d <= 0 ? `D${d}` : `Día ${d}`, medido: +(trend + noise).toFixed(2), esperado: +(d <= 0 ? 0 : EXPECTED_DAILY_PCT * d).toFixed(2) });
  }
  const lowExercise = Math.max(0, 100 - p.exercisePct);
  const raw = [
    { label: "Baja de la SOS del radio", weight: Math.abs(p.changePct), detail: `${p.changePct.toFixed(1)} % desde antes del vuelo` },
    { label: "Días en microgravedad", weight: MISSION_DAY / 60, detail: `día ${MISSION_DAY} de ${MISSION_DAYS}` },
    { label: "Ejercicio de carga incompleto", weight: lowExercise / 25, detail: `${p.exercisePct} % de lo planificado` },
    { label: "Fluidos y músculo (contorno de muñeca)", weight: p.wristPct / 4, detail: `+${p.wristPct.toFixed(1)} %, se descuenta del cálculo` },
  ];
  const total = raw.reduce((s, f) => s + f.weight, 0);
  return {
    ...p,
    sos: Math.round(p.baselineSos * (1 + p.changePct / 100)),
    missionDay: MISSION_DAY,
    expectedPct,
    ratio,
    status: boneStatus(ratio),
    index: Math.max(0, Math.round(100 - Math.abs(p.changePct) * 12 - lowExercise * 0.15)),
    projectedEndPct: +(rate * MISSION_DAYS).toFixed(1),
    history,
    factors: raw.map((f) => ({ ...f, weight: f.weight / total })).sort((a, b) => b.weight - a.weight),
  };
}

export async function getBoneHealth(astronautId: string): Promise<BoneHealth | null> {
  if (USE_MOCK) {
    const p = boneProfiles.find((b) => b.astronautId === astronautId);
    return p ? build(p) : null;
  }
  return apiGet<BoneHealth>(`/astronauts/${astronautId}/bone`);
}

/** Versión síncrona para componentes cliente con datos mock. */
export function boneHealthFor(astronautId: string): BoneHealth | null {
  const p = boneProfiles.find((b) => b.astronautId === astronautId);
  return p ? build(p) : null;
}
