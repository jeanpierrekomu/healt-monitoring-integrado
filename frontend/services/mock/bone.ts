// Datos ficticios de salud ósea medida con la pulsera (ultrasonido de transmisión axial en el radio).
// Valores de ejemplo para la demo; la tasa esperada se basa en la pérdida ósea por microgravedad que describe la NASA.

export interface BoneProfile {
  astronautId: string;
  /** Velocidad del sonido en el radio antes del vuelo (m/s). */
  baselineSos: number;
  /** Cambio de la SOS hoy frente al valor base (%). Negativo = pérdida. */
  changePct: number;
  /** Cumplimiento del ejercicio de carga (ARED) frente a lo planificado (%). */
  exercisePct: number;
  /** Cambio del contorno de muñeca (%): sobre todo desplazamiento de fluidos y músculo, no hueso. */
  wristPct: number;
  /** Calidad promedio de las mediciones (acople de la pulsera) (%). */
  quality: number;
}

export const boneProfiles: BoneProfile[] = [
  { astronautId: "lucia-mendez", baselineSos: 3912, changePct: -0.7, exercisePct: 100, wristPct: 1.1, quality: 96 },
  { astronautId: "kenji-takahashi", baselineSos: 3876, changePct: -1.3, exercisePct: 71, wristPct: 1.6, quality: 93 },
  { astronautId: "diego-vargas", baselineSos: 3954, changePct: -1.9, exercisePct: 46, wristPct: 2.3, quality: 91 },
  { astronautId: "amara-okafor", baselineSos: 3889, changePct: -0.6, exercisePct: 104, wristPct: 0.9, quality: 97 },
  { astronautId: "sofia-nilsson", baselineSos: 3842, changePct: -1.0, exercisePct: 86, wristPct: 1.4, quality: 94 },
  { astronautId: "raj-patel", baselineSos: 3901, changePct: -0.8, exercisePct: 95, wristPct: 1.0, quality: 95 },
];

export const MISSION_DAY = 42;
export const MISSION_DAYS = 180;
/** Pérdida esperada de SOS en el radio por día de microgravedad con ejercicio normal (%/día). Valor de ejemplo. */
export const EXPECTED_DAILY_PCT = -0.02;
