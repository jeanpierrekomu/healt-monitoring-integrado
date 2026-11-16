// Motor de simulación local (solo en el navegador; nunca escribe en Supabase).
// - Reproducible: con la misma semilla y el mismo programa de escenarios, el resultado es idéntico,
//   sin importar la velocidad, porque siempre avanza en pasos fijos de 1 segundo.
// - Continuo y plausible: cada signo vital se acerca poco a poco a su valor objetivo (con un ruido pequeño),
//   y los signos están correlacionados (la fiebre acelera el pulso, la falta de oxígeno acelera la respiración…).
// - Todo lo que produce es SINTÉTICO y así se muestra.
import type { Level } from "./labels";

/** Generador pseudoaleatorio con semilla (mulberry32). */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Semilla a partir de un número o un texto (la base puede guardarla de cualquiera de las dos formas). */
export function seedOf(v: unknown, fallback = 42): number {
  if (typeof v === "number" && Number.isFinite(v)) return Math.abs(Math.trunc(v));
  const s = String(v ?? "").trim();
  if (!s) return fallback;
  if (/^\d+$/.test(s)) return Number(s) % 2 ** 32;
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export type Effect = "exertion" | "hypoxia" | "tachycardia" | "bradycardia" | "fever" | "decompression" | "fatigue" | "stress";
export const EFFECT_LABEL: Record<Effect, string> = {
  exertion: "Esfuerzo físico",
  hypoxia: "Hipoxia",
  tachycardia: "Taquicardia",
  bradycardia: "Bradicardia",
  fever: "Fiebre",
  decompression: "Despresurización",
  fatigue: "Fatiga",
  stress: "Estrés",
};

/** Qué efecto fisiológico tiene un escenario, según su código, nombre o categoría. */
export function effectOf(text: string): Effect {
  const s = text.toLowerCase();
  if (/decompress|despres|depress/.test(s)) return "decompression";
  if (/hypox|hipox|oxyg|oxíg|oxig|spo2|co2/.test(s)) return "hypoxia";
  if (/brady|bradi/.test(s)) return "bradycardia";
  if (/tachy|taqui|arrhy|arrit|cardi|heart|corazón|corazon/.test(s)) return "tachycardia";
  if (/fever|fiebre|thermal|térm|term|temp|infec|heat|calor/.test(s)) return "fever";
  if (/eva|exerc|ejerc|exert|esfuer|walk|carga|load/.test(s)) return "exertion";
  if (/fatig|sleep|sueño|sueno|tired|cansa/.test(s)) return "fatigue";
  return "stress";
}

export interface Ranges {
  hr: [number, number];
  spo2: [number, number];
  temp: [number, number];
  resp: [number, number];
}
export const DEFAULT_RANGES: Ranges = { hr: [50, 100], spo2: [94, 100], temp: [36.1, 37.5], resp: [12, 20] };

export interface CrewMember {
  id: string;
  name: string;
  ranges: Ranges;
}
export interface Scheduled {
  id: string;
  name: string;
  effect: Effect;
  start: number; // segundo de inicio
  duration: number; // segundos
  astronautId: string | null; // null = toda la tripulación
  fromDb: boolean;
}
export interface Vitals {
  hr: number;
  spo2: number;
  temp: number;
  resp: number;
  sys: number;
  dia: number;
  accel: number;
}
export type VitalKey = keyof Vitals;
export interface SimEvent {
  t: number;
  kind: "scenario-start" | "scenario-end" | "alert" | "recovered";
  level: Level;
  astronautId: string | null;
  text: string;
}

// Cuánto mueve cada efecto a cada signo (a intensidad completa).
const DELTA: Record<Effect, Partial<Vitals>> = {
  exertion: { hr: 55, resp: 12, sys: 25, dia: 5, temp: 0.5, accel: 3.5, spo2: -1 },
  hypoxia: { spo2: -11, hr: 22, resp: 8 },
  tachycardia: { hr: 72 },
  bradycardia: { hr: -24 },
  fever: { temp: 1.7, hr: 14, resp: 4 },
  decompression: { spo2: -16, hr: 35, resp: 12, sys: -18, dia: -10 },
  fatigue: { hr: -6, resp: -2, accel: -0.15 },
  stress: { hr: 22, sys: 16, dia: 9, resp: 4 },
};
// Segundos que tarda cada signo en acercarse a su objetivo, y su ruido por segundo.
const TAU: Vitals = { hr: 12, spo2: 20, temp: 240, resp: 15, sys: 25, dia: 25, accel: 3 };
const NOISE: Vitals = { hr: 0.8, spo2: 0.12, temp: 0.004, resp: 0.25, sys: 0.6, dia: 0.4, accel: 0.05 };
const LIMITS: Record<VitalKey, [number, number]> = { hr: [30, 200], spo2: [70, 100], temp: [34, 41.5], resp: [6, 45], sys: [70, 200], dia: [40, 120], accel: [0, 20] };

const clamp = (v: number, [a, b]: [number, number]) => Math.min(b, Math.max(a, v));
const ramp = (x: number) => x * x * (3 - 2 * x);

/** Nivel de un signo según los rangos del astronauta (umbrales de ejemplo, no clínicos). */
export function levelOf(key: "hr" | "spo2" | "temp" | "resp" | "sys", v: number, r: Ranges): Level {
  switch (key) {
    case "hr": return v > 140 || v < 40 ? "critico" : v > r.hr[1] || v < r.hr[0] ? "advertencia" : "normal";
    case "spo2": return v < 88 ? "critico" : v < r.spo2[0] ? "advertencia" : "normal";
    case "temp": return v > 39 || v < 35 ? "critico" : v > r.temp[1] || v < r.temp[0] ? "advertencia" : "normal";
    case "resp": return v > 30 || v < 8 ? "critico" : v > r.resp[1] || v < r.resp[0] ? "advertencia" : "normal";
    case "sys": return v > 180 || v < 85 ? "critico" : v > 140 ? "advertencia" : "normal";
  }
}
const CHECK: { key: "hr" | "spo2" | "temp" | "resp" | "sys"; label: string; unit: string; dec: number }[] = [
  { key: "hr", label: "Frecuencia cardíaca", unit: "lpm", dec: 0 },
  { key: "spo2", label: "SpO₂", unit: "%", dec: 1 },
  { key: "temp", label: "Temperatura", unit: "°C", dec: 1 },
  { key: "resp", label: "Frecuencia respiratoria", unit: "rpm", dec: 0 },
  { key: "sys", label: "Presión sistólica", unit: "mmHg", dec: 0 },
];
const RANK: Record<Level, number> = { normal: 0, atencion: 1, advertencia: 2, critico: 3 };

interface MemberState {
  m: CrewMember;
  rand: () => number;
  base: Vitals;
  now: Vitals;
  levels: Record<string, Level>;
}

export class Simulator {
  t = 0;
  private members: MemberState[];
  private schedule: Scheduled[];

  constructor(crew: CrewMember[], schedule: Scheduled[], seed: number) {
    this.schedule = schedule;
    this.members = crew.map((m, i) => {
      const rand = rng(seed + i * 7919);
      const base: Vitals = {
        hr: m.ranges.hr[0] + (m.ranges.hr[1] - m.ranges.hr[0]) * (0.3 + rand() * 0.12),
        spo2: Math.min(99, m.ranges.spo2[1] - 0.8 - rand() * 0.6),
        temp: (m.ranges.temp[0] + m.ranges.temp[1]) / 2 - 0.1 + rand() * 0.15,
        resp: (m.ranges.resp[0] + m.ranges.resp[1]) / 2 - 1 + rand(),
        sys: 112 + rand() * 10,
        dia: 72 + rand() * 6,
        accel: 0.15 + rand() * 0.1,
      };
      return { m, rand, base, now: { ...base }, levels: {} };
    });
  }

  /** Intensidad (0 a 1) de un escenario en el segundo t: sube, se mantiene y baja de forma suave. */
  private intensity(s: Scheduled, t: number) {
    if (t < s.start || t > s.start + s.duration) return 0;
    const edge = Math.min(60, s.duration / 3);
    const up = (t - s.start) / edge;
    const down = (s.start + s.duration - t) / edge;
    return ramp(Math.max(0, Math.min(1, up, down)));
  }

  private gauss(rand: () => number) {
    const u = Math.max(1e-9, rand());
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
  }

  /** Avanza un segundo. Devuelve los eventos que ocurrieron en ese segundo. */
  step(): SimEvent[] {
    const events: SimEvent[] = [];
    const t = this.t + 1;
    for (const s of this.schedule) {
      if (this.t < s.start && t >= s.start) events.push({ t, kind: "scenario-start", level: "atencion", astronautId: s.astronautId, text: `Comienza el escenario «${s.name}» (${EFFECT_LABEL[s.effect]})` });
      if (this.t < s.start + s.duration && t >= s.start + s.duration) events.push({ t, kind: "scenario-end", level: "normal", astronautId: s.astronautId, text: `Termina el escenario «${s.name}»` });
    }
    for (const st of this.members) {
      const target: Vitals = { ...st.base };
      for (const s of this.schedule) {
        if (s.astronautId && s.astronautId !== st.m.id) continue;
        const k = this.intensity(s, t);
        if (!k) continue;
        for (const [key, d] of Object.entries(DELTA[s.effect]) as [VitalKey, number][]) target[key] += d * k;
      }
      // Correlaciones: la temperatura sube el pulso y la falta de oxígeno acelera la respiración.
      target.hr += 8 * Math.max(0, st.now.temp - st.base.temp);
      target.resp += 0.6 * Math.max(0, st.base.spo2 - st.now.spo2);
      for (const key of Object.keys(st.now) as VitalKey[]) {
        const next = st.now[key] + (target[key] - st.now[key]) / TAU[key] + NOISE[key] * this.gauss(st.rand);
        st.now[key] = clamp(next, LIMITS[key]);
      }
      for (const c of CHECK) {
        const lv = levelOf(c.key, st.now[c.key], st.m.ranges);
        const prev = st.levels[c.key] ?? "normal";
        if (RANK[lv] > RANK[prev]) {
          events.push({ t, kind: "alert", level: lv, astronautId: st.m.id, text: `${st.m.name}: ${c.label} ${st.now[c.key].toFixed(c.dec)} ${c.unit}` });
        } else if (lv === "normal" && prev !== "normal") {
          events.push({ t, kind: "recovered", level: "normal", astronautId: st.m.id, text: `${st.m.name}: ${c.label} vuelve a su rango` });
        }
        st.levels[c.key] = lv;
      }
    }
    this.t = t;
    return events;
  }

  snapshot(): Record<string, Vitals> {
    return Object.fromEntries(this.members.map((s) => [s.m.id, { ...s.now }]));
  }
}

export function activityOf(accel: number) {
  return accel > 2 ? "Ejercicio intenso" : accel > 0.8 ? "Actividad ligera" : "Reposo";
}

/** Escenarios de demostración que se ofrecen solo si la base todavía no tiene escenarios. */
export const DEMO_CATALOG: { code: string; name: string; effect: Effect }[] = [
  { code: "DEMO-EVA", name: "Caminata espacial (EVA)", effect: "exertion" },
  { code: "DEMO-HYPOXIA", name: "Hipoxia leve en cabina", effect: "hypoxia" },
  { code: "DEMO-TACHY", name: "Arritmia con taquicardia", effect: "tachycardia" },
  { code: "DEMO-FEVER", name: "Fiebre por infección", effect: "fever" },
  { code: "DEMO-DECOMP", name: "Despresurización lenta", effect: "decompression" },
  { code: "DEMO-FATIGUE", name: "Fatiga acumulada", effect: "fatigue" },
  { code: "DEMO-STRESS", name: "Estrés operativo", effect: "stress" },
];
