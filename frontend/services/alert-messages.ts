// Frases de las alertas emergentes: el texto que se ve y la frase que se lee en voz alta.
// La voz recibe números y unidades en palabras ("118 latidos por minuto") para sonar natural.
// La app mide signos vitales, no diagnostica: por eso dice "taquicardia" o "se le aceleró el corazón",
// nunca "infarto", y el médico siempre confirma.
import type { Astronaut, HealthAlert, Status, VitalKey } from "@/lib/types";
import { bandFor, vitalContext } from "./education";
import { describeReason, PRIORITY_TO_STATUS, type ReasonKind } from "./backend-text";

export type AlertTopic = VitalKey | "bone" | "arrest" | "model";
/** Temas con frase propia (los del modelo del backend traen su texto). */
type VitalTopic = Exclude<AlertTopic, "model">;

/** Niveles que se ven y se escuchan: leve (atención), grave (advertencia) y máxima (crítico). */
export const LEVEL: Partial<Record<Status, string>> = { atencion: "Alerta leve", advertencia: "Alerta grave", critico: "Alerta máxima" };

export interface PopupAlert {
  id: string;
  astronautId: string;
  name: string;
  topic: AlertTopic;
  severity: Status;
  /** Valor medido (para comparar empeoramientos); null si no aplica. */
  value: number | null;
  valueText: string;
  title: string;
  text: string;
  speech: string;
  time: string;
  /** Qué hacer: pasos sugeridos para la tripulación y el médico. */
  steps: string[];
  /** Si agrupa a varios astronautas (p. ej. temperatura alta en 3). */
  group?: { ids: string[]; names: string[] };
}

// Pasos sugeridos por tipo de alerta. Orientativos: el médico de vuelo siempre confirma la decisión.
const STEPS: Record<AlertTopic | "hr_low", string[]> = {
  model: [], // las del modelo traen sus propios pasos (MODEL_STEPS)
  hr: [
    "Detener el ejercicio y reposar 20 min.",
    "Repetir la medición y revisar que el sensor esté bien puesto.",
    "Vigilar hidratación y estrés del turno.",
    "Si sigue sobre 110 lpm o hay mareo o dolor de pecho, avisar al cirujano de vuelo.",
  ],
  hr_low: [
    "Comprobar si está dormido o en reposo profundo.",
    "Revisar el sensor.",
    "Si hay mareo o desmayo, avisar al médico.",
  ],
  arrest: [
    "Confirmar: ¿responde?, ¿respira? (descartar un sensor suelto).",
    "Avisar a la oficial médica a bordo y a toda la tripulación.",
    "Iniciar RCP adaptada a microgravedad y usar el desfibrilador (DEA).",
    "Contactar de inmediato al cirujano de vuelo en Tierra.",
  ],
  spo2: [
    "Revisar el oxímetro (dedo frío o mal colocado).",
    "Repetir la medición.",
    "Verificar oxígeno y CO₂ de la cabina.",
    "Si sigue bajo 92 %, oxígeno suplementario y avisar al médico.",
  ],
  temp: [
    "Registrar síntomas (dolor, tos, escalofríos).",
    "Hidratar y bajar la intensidad del ejercicio.",
    "Repetir la medición en 30 min.",
    "Si supera 38 °C, consulta médica.",
  ],
  hrv: ["Revisar horas y calidad del sueño.", "Reducir la carga de trabajo del turno.", "Repetir la medición al despertar."],
  bone: [
    "Revisar el cumplimiento del ejercicio de resistencia (ARED).",
    "Revisar calcio y vitamina D en la dieta.",
    "Programar una nueva medición.",
  ],
}

const spoken = (v: number, decimals: number) => v.toFixed(decimals).replace(".", ",");

function phrase(topic: VitalTopic, severity: Status, name: string, value: number | null, high: boolean) {
  const crit = severity === "critico";
  const lead = `${LEVEL[severity] ?? "Alerta leve"}.`;
  const v = value ?? 0;
  switch (topic) {
    case "arrest":
      return {
        text: `Posible paro cardíaco en ${name}: no se detecta pulso.`,
        speech: `${lead} Posible paro cardíaco en ${name}: no se detecta pulso.`,
      };
    case "hr":
      return high
        ? {
            text: `A ${name} se le ha acelerado el corazón: ${Math.round(v)} lpm.`,
            speech: `${lead} A ${name} se le ha acelerado el corazón: ${Math.round(v)} latidos por minuto.`,
          }
        : {
            text: `${name} tiene el pulso muy bajo: ${Math.round(v)} lpm.`,
            speech: `${lead} ${name} tiene el pulso muy bajo: ${Math.round(v)} latidos por minuto.`,
          };
    case "spo2":
      return {
        text: `${name} tiene la saturación de oxígeno ${crit ? "muy baja" : "baja"}: ${Math.round(v)} %.`,
        speech: `${lead} ${name} tiene la saturación de oxígeno ${crit ? "muy baja" : "baja"}: ${Math.round(v)} por ciento.`,
      };
    case "temp":
      return high
        ? {
            text: `${name} tiene ${crit ? "fiebre" : "la temperatura elevada"}: ${v.toFixed(1)} °C.`,
            speech: `${lead} ${name} tiene ${crit ? "fiebre" : "la temperatura elevada"}: ${spoken(v, 1)} grados.`,
          }
        : {
            text: `${name} tiene la temperatura baja: ${v.toFixed(1)} °C.`,
            speech: `${lead} ${name} tiene la temperatura baja: ${spoken(v, 1)} grados.`,
          };
    case "hrv":
      return {
        text: `${name} muestra signos de fatiga: HRV de ${Math.round(v)} ms.`,
        speech: `${lead} ${name} muestra signos de fatiga: variabilidad cardiaca de ${Math.round(v)} milisegundos.`,
      };
    case "bone":
      return {
        text: `${name} está perdiendo masa ósea más rápido de lo esperado.`,
        speech: `${lead} ${name} está perdiendo masa ósea más rápido de lo esperado.`,
      };
  }
}

const UNIT: Record<AlertTopic, string> = { hr: "lpm", hrv: "ms", spo2: "%", temp: "°C", bone: "", arrest: "", model: "" };
const now = () => new Date().toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });

/** Alerta generada en vivo cuando un signo vital empeora de estado. */
export function alertFromVital(a: Pick<Astronaut, "id" | "name" | "sex" | "baseline">, key: VitalKey, value: number, severity: Status): PopupAlert {
  const high = value >= a.baseline[key];
  // Sin pulso (por debajo de 30 lpm) se trata como posible paro cardíaco.
  const topic: VitalTopic = key === "hr" && value < 30 ? "arrest" : key;
  const { text, speech } = phrase(topic, severity, a.name, value, high);
  return {
    id: `live-${a.id}-${key}-${Date.now()}`,
    astronautId: a.id,
    name: a.name,
    topic,
    steps: STEPS[topic === "hr" && !high ? "hr_low" : topic],
    severity,
    value,
    valueText: topic === "arrest" ? "Sin pulso" : `${Math.max(0, value).toFixed(key === "temp" ? 1 : 0)} ${UNIT[key]}`,
    title: topic === "arrest" ? "Posible paro cardíaco" : bandFor(key, value, vitalContext(a, key)).label,
    text,
    speech,
    time: now(),
  };
}

function topicOf(variable: string): VitalTopic {
  const v = variable.toLowerCase();
  if (v.includes("ósea") || v.includes("osea")) return "bone";
  if (v.includes("spo")) return "spo2";
  if (v.includes("hrv")) return "hrv";
  if (v.includes("temp")) return "temp";
  return "hr";
}

/** Convierte una alerta ya registrada (servicio de alertas) en una alerta emergente. */
export function alertFromRecord(r: HealthAlert, a: Pick<Astronaut, "name" | "baseline">): PopupAlert {
  const topic = topicOf(r.variable);
  const value = Number.parseFloat(r.value.replace("−", "-").replace(",", "."));
  const num = Number.isFinite(value) ? value : null;
  const high = topic === "bone" || topic === "arrest" || num === null ? true : num >= a.baseline[topic];
  const { text, speech } = phrase(topic, r.severity, a.name, num, high);
  return {
    id: r.id,
    astronautId: r.astronautId,
    name: a.name,
    topic,
    steps: STEPS[topic === "hr" && !high ? "hr_low" : topic],
    severity: r.severity,
    value: topic === "bone" ? null : num,
    valueText: r.value,
    title: r.title,
    text,
    speech,
    time: r.time,
  };
}

/** Una sola alerta para varios astronautas con el mismo problema (p. ej. temperatura alta en 3). */
export function groupAlert(topic: VitalKey, severity: Status, people: { id: string; name: string; value: number }[]): PopupAlert {
  const names = people.map((p) => p.name);
  const first = names.map((n) => n.split(" ")[0]);
  const list = first.length > 1 ? `${first.slice(0, -1).join(", ")} y ${first[first.length - 1]}` : first[0];
  const what: Record<VitalKey, string> = {
    temp: "se les ha subido la temperatura",
    hr: "se les ha acelerado el pulso",
    spo2: "tienen la saturación de oxígeno baja",
    hrv: "muestran signos de fatiga",
  };
  const lead = `${LEVEL[severity] ?? "Alerta leve"}.`;
  return {
    id: `group-${topic}-${people.map((p) => p.id).join("-")}-${Date.now()}`,
    astronautId: people[0].id,
    name: list,
    topic,
    severity,
    value: null,
    valueText: people.map((p) => `${p.name.split(" ")[0]} ${p.value.toFixed(topic === "temp" ? 1 : 0)} ${UNIT[topic]}`).join(" · "),
    title: `${people.length} astronautas`,
    text: `A ${people.length} astronautas ${what[topic]}: ${list}.`,
    speech: `${lead} A ${people.length} astronautas ${what[topic]}: ${list}.`,
    time: now(),
    steps: STEPS[topic],
    group: { ids: people.map((p) => p.id), names },
  };
}

/** Las tres alertas de la demo: leve (grupo), grave y máxima. */
export function demoAlerts(crew: Pick<Astronaut, "id" | "name" | "sex" | "baseline">[]): PopupAlert[] {
  // Se eligen por posición, para que funcione con cualquier tripulación (la de ejemplo o la del backend).
  const at = (i: number) => crew[i % crew.length];
  const feverish = [...new Set([1, 2, 3].map(at))].map((c, i) => ({ ...c, value: [37.6, 37.7, 37.5][i] }));
  return [
    groupAlert("temp", "atencion", feverish),
    alertFromVital(at(2), "spo2", 93, "advertencia"),
    alertFromVital(at(0), "hr", 0, "critico"),
  ];
}

/** Simulación en vivo (hasta que exista el backend): la alerta número `i` de una rotación variada. */
export function feedAlert(crew: Pick<Astronaut, "id" | "name" | "sex" | "baseline">[], i: number): PopupAlert {
  const at = (k: number) => crew[k % crew.length];
  const j = (n: number, amp: number) => n + (Math.random() - 0.5) * amp; // pequeña variación para que no se repita igual
  const feed: (() => PopupAlert)[] = [
    () => alertFromVital(at(2), "spo2", j(93, 1), "advertencia"),
    () => groupAlert("temp", "atencion", [...new Set([1, 2, 3].map(at))].map((c) => ({ ...c, value: j(37.6, 0.2) }))),
    () => alertFromVital(at(0), "hr", j(132, 10), "critico"),
    () => alertFromVital(at(3), "hrv", j(36, 4), "atencion"),
    () => alertFromVital(at(1), "temp", j(37.8, 0.2), "advertencia"),
    () => alertFromVital(at(0), "hr", j(104, 6), "advertencia"),
    () => alertFromVital(at(2), "spo2", j(90, 1), "critico"),
    () => alertFromVital(at(1), "hrv", j(30, 3), "advertencia"),
  ];
  return feed[i % feed.length]();
}

// Pasos para las alertas que emite el modelo del backend (no son de un signo vital concreto).
const MODEL_STEPS: Record<ReasonKind, string[]> = {
  sleep: [
    "Es una detección del modelo, no una emergencia.",
    "Confirmar que el tripulante está en su periodo de descanso.",
    "Si no debería estar dormido, contactarlo por radio.",
  ],
  vision: [
    "Revisar la cámara del módulo.",
    "Confirmar con el tripulante que está bien.",
    "Si no responde, avisar al médico de vuelo.",
  ],
  fusion: [
    "Revisar juntos los datos físicos, de cámara y de audio.",
    "Confirmar con el tripulante que está bien.",
    "Si las señales no coinciden, repetir la medición.",
  ],
  other: ["Revisar el detalle de la alerta.", "Confirmar con el tripulante que está bien.", "Si persiste, avisar al médico de vuelo."],
};

/** Convierte una alerta recién llegada del backend en una alerta emergente. */
export function alertFromBackend(row: { id: number; crew_member_id: string | null; priority: string; reason: string }, name: string): PopupAlert {
  const d = describeReason(row.reason);
  const severity = PRIORITY_TO_STATUS[row.priority] ?? "atencion";
  const lead = `${LEVEL[severity] ?? "Alerta leve"}.`;
  const what = d.title.charAt(0).toLowerCase() + d.title.slice(1);
  return {
    id: `backend-${row.id}`,
    astronautId: row.crew_member_id ?? "",
    name,
    topic: "model",
    severity: severity === "normal" ? "atencion" : severity,
    value: null,
    valueText: d.value,
    title: d.title,
    text: `${name}: ${what}.`,
    speech: `${lead} ${name}: ${what}.`,
    time: now(),
    steps: MODEL_STEPS[d.kind],
  };
}
