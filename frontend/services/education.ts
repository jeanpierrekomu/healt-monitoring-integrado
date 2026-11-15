// Contenido didáctico de cada signo vital: qué mide, rangos y por qué cambia en el espacio.
// Los rangos también definen el estado (Normal / Atención / Advertencia / Crítico) en toda la app.
import type { Astronaut, Sex, Status, VitalKey } from "@/lib/types";

export interface Band {
  to: number; // límite superior (exclusivo) de la franja
  status: Status;
  label: string;
}

export interface VitalEducation {
  key: VitalKey;
  name: string;
  unit: string;
  what: string;
  normal: string;
  space: string;
  domain: [number, number];
  bands: Band[];
  decimals: number;
}

export const VITAL_EDUCATION: Record<VitalKey, VitalEducation> = {
  hr: {
    key: "hr",
    name: "Frecuencia cardiaca (HR)",
    unit: "lpm",
    what: "Cuántas veces late el corazón por minuto. Sube con el esfuerzo, el estrés, la fiebre o la deshidratación.",
    normal: "60–85 lpm en reposo",
    space:
      "En microgravedad la sangre y los fluidos se desplazan hacia la cabeza y el corazón trabaja distinto. Las 2 h diarias de ejercicio obligatorio, el estrés y la falta de sueño pueden subirla.",
    domain: [40, 140],
    decimals: 0,
    bands: [
      { to: 30, status: "critico", label: "Sin pulso" },
      { to: 50, status: "advertencia", label: "Muy baja" },
      { to: 60, status: "atencion", label: "Baja" },
      { to: 85, status: "normal", label: "Normal" },
      { to: 95, status: "atencion", label: "Elevada" },
      { to: 110, status: "advertencia", label: "Alta" },
      { to: Infinity, status: "critico", label: "Taquicardia" },
    ],
  },
  hrv: {
    key: "hrv",
    name: "Variabilidad cardiaca (HRV)",
    unit: "ms",
    what: "Cuánto varía el tiempo entre un latido y el siguiente. Una HRV alta indica un cuerpo descansado; una baja, estrés o fatiga.",
    normal: "Más de 45 ms (varía mucho entre personas)",
    space:
      "El aislamiento, los turnos irregulares y la luz artificial alteran el sueño. Por eso la HRV es uno de los mejores indicadores tempranos de fatiga en misiones largas.",
    domain: [10, 80],
    decimals: 0,
    bands: [
      { to: 30, status: "advertencia", label: "Muy baja" },
      { to: 45, status: "atencion", label: "Baja" },
      { to: Infinity, status: "normal", label: "Normal" },
    ],
  },
  spo2: {
    key: "spo2",
    name: "Saturación de oxígeno (SpO₂)",
    unit: "%",
    what: "Qué porcentaje de la hemoglobina de la sangre lleva oxígeno. Se mide con luz en el dedo (oxímetro).",
    normal: "96–100 %",
    space:
      "La cabina mantiene una presión y un oxígeno parecidos a los de la Tierra. Si la SpO₂ baja, suele significar un problema del soporte vital, de la ventilación o del propio sensor.",
    domain: [85, 100],
    decimals: 0,
    bands: [
      { to: 92, status: "critico", label: "Hipoxia" },
      { to: 95, status: "advertencia", label: "Baja" },
      { to: 96, status: "atencion", label: "Límite" },
      { to: Infinity, status: "normal", label: "Normal" },
    ],
  },
  temp: {
    key: "temp",
    name: "Temperatura corporal",
    unit: "°C",
    what: "La temperatura interna del cuerpo. Sube con infecciones, inflamación o esfuerzo intenso.",
    normal: "36.0–37.0 °C",
    space:
      "Estudios en la Estación Espacial midieron que la temperatura corporal sube cerca de 1 °C en misiones largas (la llamada “fiebre espacial”): sin gravedad el cuerpo disipa peor el calor.",
    domain: [35.5, 38.5],
    decimals: 1,
    bands: [
      { to: 36, status: "atencion", label: "Baja" },
      { to: 37.1, status: "normal", label: "Normal" },
      { to: 37.5, status: "atencion", label: "Elevada" },
      { to: 38, status: "advertencia", label: "Febrícula" },
      { to: Infinity, status: "critico", label: "Fiebre" },
    ],
  },
};

// ── Ajustes por sexo ─────────────────────────────────────────────────────────────
// Hombres y mujeres tienen fisiología distinta: en promedio, las mujeres tienen unos pocos lpm más
// en reposo y su temperatura sube ~0,3–0,5 °C en la fase lútea del ciclo. SpO₂ y HRV usan el mismo rango
// (la HRV se juzga sobre todo contra la línea base personal). VALORES DE EJEMPLO: reemplazar por los de las
// fuentes de la pestaña Referencias.
const FEMALE_BANDS: Partial<Record<VitalKey, Band[]>> = {
  hr: [
    { to: 30, status: "critico", label: "Sin pulso" },
    { to: 50, status: "advertencia", label: "Muy baja" },
    { to: 60, status: "atencion", label: "Baja" },
    { to: 90, status: "normal", label: "Normal" },
    { to: 100, status: "atencion", label: "Elevada" },
    { to: 110, status: "advertencia", label: "Alta" },
    { to: Infinity, status: "critico", label: "Taquicardia" },
  ],
  temp: [
    { to: 36, status: "atencion", label: "Baja" },
    { to: 37.3, status: "normal", label: "Normal" },
    { to: 37.6, status: "atencion", label: "Elevada" },
    { to: 38, status: "advertencia", label: "Febrícula" },
    { to: Infinity, status: "critico", label: "Fiebre" },
  ],
};

const FEMALE_NORMAL: Partial<Record<VitalKey, string>> = {
  hr: "60–90 lpm en reposo",
  temp: "36.0–37.2 °C",
};

export const SEX_LABEL: Record<Sex, string> = { F: "Mujer", M: "Hombre" };

/** Por qué el rango cambia según el sexo (null = mismo rango para todos). */
export const SEX_NOTE: Record<VitalKey, string | null> = {
  hr: "En promedio, las mujeres tienen unos pocos latidos por minuto más en reposo (corazón más pequeño, que bombea menos sangre por latido). Por eso su límite de \"normal\" es algo más alto.",
  hrv: "La HRV cambia con la edad, el sexo y el ciclo menstrual. Como varía tanto entre personas, se compara sobre todo contra el normal de cada astronauta.",
  spo2: null,
  temp: "En la fase lútea del ciclo menstrual la temperatura sube unos 0,3–0,5 °C. Un 37,2 °C puede ser normal en ella y no indicar fiebre.",
};

/** Contexto de una persona para juzgar un valor: su sexo y su normal personal. */
export interface VitalContext {
  sex?: Sex;
  baseline?: number;
}

export function vitalContext(a: Pick<Astronaut, "sex" | "baseline">, key: VitalKey): VitalContext {
  return { sex: a.sex, baseline: a.baseline?.[key] };
}

export function bandsFor(key: VitalKey, ctx?: VitalContext): Band[] {
  return (ctx?.sex === "F" && FEMALE_BANDS[key]) || VITAL_EDUCATION[key].bands;
}

export function normalFor(key: VitalKey, ctx?: VitalContext): string {
  return (ctx?.sex === "F" && FEMALE_NORMAL[key]) || VITAL_EDUCATION[key].normal;
}

export function bandFor(key: VitalKey, value: number, ctx?: VitalContext): Band {
  const bands = bandsFor(key, ctx);
  return bands.find((b) => value < b.to) ?? bands[bands.length - 1];
}

// ── Línea base personal ──────────────────────────────────────────────────────────
// Además del rango general, se mira cuánto se aleja cada persona de SU normal.
// Así un 84 lpm puede ser normal para alguien de 78 y preocupante para alguien de 58. VALORES DE EJEMPLO.
const RANK: Record<Status, number> = { normal: 0, atencion: 1, advertencia: 2, critico: 3 };

export function worse(a: Status, b: Status): Status {
  return RANK[a] >= RANK[b] ? a : b;
}

export function statusRank(s: Status) {
  return RANK[s];
}

export interface PersonalDeviation {
  status: Status;
  /** Diferencia con su normal, en texto ("+22 lpm", "−35 %"). */
  delta: string;
}

export function personalDeviation(key: VitalKey, value: number, baseline?: number): PersonalDeviation | null {
  if (baseline === undefined) return null;
  const d = value - baseline;
  const sign = (n: number) => (n >= 0 ? "+" : "−") + Math.abs(n);
  switch (key) {
    case "hr":
      return { status: d >= 30 ? "advertencia" : d >= 20 ? "atencion" : "normal", delta: `${sign(Math.round(d))} lpm` };
    case "hrv": {
      const r = value / baseline;
      return { status: r <= 0.6 ? "advertencia" : r <= 0.75 ? "atencion" : "normal", delta: `${sign(Math.round((r - 1) * 100))} %` };
    }
    case "spo2":
      return { status: d <= -4 ? "advertencia" : d <= -3 ? "atencion" : "normal", delta: `${sign(Math.round(d))} %` };
    case "temp":
      return { status: d >= 1 ? "advertencia" : d >= 0.7 ? "atencion" : "normal", delta: `${sign(Math.round(d * 10) / 10)} °C` };
  }
}

/** Estado final: el peor entre el rango (según sexo) y la distancia a su normal personal. */
export function statusFor(key: VitalKey, value: number, ctx?: VitalContext): Status {
  const band = bandFor(key, value, ctx).status;
  const personal = personalDeviation(key, value, ctx?.baseline);
  return personal ? worse(band, personal.status) : band;
}
