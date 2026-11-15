// Masa corporal estimada con la cámara. Los datos de los astronautas y los umbrales son de ejemplo;
// el cálculo usa la silueta real de la persona vista de frente y de perfil. En microgravedad no sirve una balanza,
// por eso se busca estimar la masa a partir de la forma del cuerpo.
import type { Sex, Status } from "@/lib/types";

export interface BodyRef {
  /** Estatura en cm (dato de la ficha médica; sirve de escala para la imagen). */
  heightCm: number;
  /** Masa medida antes del vuelo, en kg. */
  preflightKg: number;
}

// Valores de ejemplo.
const REF: Record<string, BodyRef> = {
  "lucia-mendez": { heightCm: 166, preflightKg: 61 },
  "kenji-takahashi": { heightCm: 174, preflightKg: 70 },
  "diego-vargas": { heightCm: 180, preflightKg: 79 },
  "amara-okafor": { heightCm: 170, preflightKg: 64 },
  "sofia-nilsson": { heightCm: 172, preflightKg: 63 },
  "raj-patel": { heightCm: 176, preflightKg: 73 },
};

export function bodyRef(id: string, sex: Sex): BodyRef {
  return REF[id] ?? (sex === "F" ? { heightCm: 165, preflightKg: 60 } : { heightCm: 177, preflightKg: 76 });
}

/** Cantidad de rebanadas en que se divide el cuerpo, de la cabeza a los pies. */
export const SLICES = 160;
// Densidad media del cuerpo humano, muy cercana a la del agua (valor aproximado).
const DENSITY = 1010; // kg/m³

/**
 * Masa (kg) con el método de zonas elípticas: el cuerpo se corta en rebanadas horizontales y cada una
 * se trata como una elipse cuyo ancho se ve de frente y cuyo fondo se ve de perfil.
 * `front` y `side` traen el ancho de cada rebanada en metros; `heightM` es la estatura.
 */
export function massFromProfiles(front: Float32Array, side: Float32Array, heightM: number) {
  const dy = heightM / SLICES;
  let volume = 0;
  for (let i = 0; i < SLICES; i++) volume += (Math.PI / 4) * front[i] * side[i] * dy;
  return volume * DENSITY;
}

/** Qué tan preocupante es el cambio de masa respecto a antes del vuelo (umbrales de ejemplo). */
export function massStatus(deltaPct: number): Status {
  const loss = -deltaPct;
  if (loss >= 10) return "critico";
  if (loss >= 7) return "advertencia";
  if (loss >= 3 || deltaPct >= 5) return "atencion";
  return "normal";
}
