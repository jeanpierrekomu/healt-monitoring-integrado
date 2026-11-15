// Resultados de los modelos de IA (mock). Se reemplazan por las respuestas del servicio de ML.

// --- Visión
// Video de la cámara CAM-02 (generado con IA para la demo) y detecciones con seguimiento.
// Coordenadas en % del fotograma; cada pista tiene posiciones por segundo y se interpola entre ellas.
export const VISION_VIDEO = { src: "/media/habitat-cam.mp4", poster: "/media/habitat-cam-poster.jpg", duration: 7.85 };

export type Box = { t: number; l: number; y: number; w: number; h: number };

export interface VisionTrack {
  id: string;
  label: string;
  conf: number;
  color: string;
  window?: [number, number]; // segundos en los que la detección está activa
  keys: Box[];
}

export const VISION_TRACKS: VisionTrack[] = [
  {
    id: "persona", label: "Persona · D. Vargas", conf: 97, color: "#22C55E",
    keys: [
      { t: 0, l: 31, y: 40, w: 38, h: 60 }, { t: 1, l: 32, y: 36, w: 38, h: 64 }, { t: 2, l: 31, y: 32, w: 40, h: 68 },
      { t: 3, l: 35, y: 28, w: 37, h: 72 }, { t: 4, l: 37, y: 22, w: 33, h: 78 }, { t: 5, l: 37, y: 19, w: 34, h: 81 },
      { t: 6, l: 30, y: 13, w: 45, h: 87 }, { t: 7, l: 32, y: 10, w: 42, h: 90 }, { t: 7.85, l: 32, y: 9, w: 42, h: 91 },
    ],
  },
  {
    id: "fatiga", label: "Fatiga facial", conf: 72, color: "#EF4444",
    keys: [
      { t: 0, l: 49, y: 42, w: 10, h: 17 }, { t: 1, l: 46, y: 38, w: 9, h: 17 }, { t: 2, l: 49, y: 34, w: 10, h: 17 },
      { t: 3, l: 52, y: 29, w: 9, h: 17 }, { t: 4, l: 50, y: 24, w: 9, h: 17 }, { t: 5, l: 51, y: 23, w: 9, h: 17 },
      { t: 6, l: 53, y: 18, w: 9, h: 17 }, { t: 7, l: 53, y: 12, w: 9, h: 17 }, { t: 7.85, l: 53, y: 11, w: 9, h: 17 },
    ],
  },
  {
    id: "botella", label: "Botella O₂", conf: 93, color: "#4F8CFF",
    keys: [
      { t: 0, l: 73, y: 28, w: 15, h: 70 }, { t: 2, l: 75, y: 24, w: 16, h: 74 }, { t: 3, l: 76, y: 30, w: 16, h: 70 },
      { t: 4, l: 77, y: 26, w: 16, h: 74 }, { t: 5, l: 79, y: 30, w: 16, h: 70 }, { t: 6, l: 80, y: 30, w: 14, h: 70 },
      { t: 7.85, l: 82, y: 30, w: 15, h: 70 },
    ],
  },
  {
    id: "frente", label: "Se seca la frente", conf: 81, color: "#EAB308", window: [2.4, 3.8],
    keys: [{ t: 2.4, l: 47, y: 25, w: 22, h: 26 }, { t: 3, l: 47, y: 25, w: 22, h: 26 }, { t: 3.8, l: 47, y: 22, w: 20, h: 26 }],
  },
  {
    id: "pecho", label: "Mano en el pecho", conf: 76, color: "#F97316", window: [4.2, 7],
    keys: [{ t: 4.2, l: 47, y: 43, w: 13, h: 15 }, { t: 5, l: 48, y: 41, w: 13, h: 15 }, { t: 6, l: 46, y: 36, w: 14, h: 16 }, { t: 7, l: 46, y: 33, w: 14, h: 16 }],
  },
];

export const VISION_FINDINGS = [
  { id: "persona", label: "Persona identificada", sub: "D. Vargas · todo el video", conf: 97, bar: "bg-normal", text: "text-normal" },
  { id: "botella", label: "Botella de O₂", sub: "Equipo de soporte vital", conf: 93, bar: "bg-primary", text: "text-primary" },
  { id: "fatiga", label: "Signos de fatiga facial", sub: "Ojos entrecerrados, rostro tenso", conf: 72, bar: "bg-critico", text: "text-critico" },
  { id: "frente", label: "Se seca la frente", sub: "Evidencia 00:02 – 00:04 · posible sudoración", conf: 81, bar: "bg-atencion", text: "text-atencion" },
  { id: "pecho", label: "Mano en el pecho", sub: "Evidencia 00:04 – 00:07 · posible molestia torácica", conf: 76, bar: "bg-advertencia", text: "text-advertencia" },
];

/** Posición interpolada de una pista en el segundo `t` (null si está fuera de su ventana). */
export function boxAt(track: VisionTrack, t: number): Box | null {
  if (track.window && (t < track.window[0] || t > track.window[1])) return null;
  const k = track.keys;
  if (t <= k[0].t) return k[0];
  for (let i = 0; i < k.length - 1; i++) {
    const a = k[i];
    const b = k[i + 1];
    if (t >= a.t && t <= b.t) {
      const f = (t - a.t) / (b.t - a.t || 1);
      const s = f * f * (3 - 2 * f); // suavizado
      return { t, l: a.l + (b.l - a.l) * s, y: a.y + (b.y - a.y) * s, w: a.w + (b.w - a.w) * s, h: a.h + (b.h - a.h) * s };
    }
  }
  return k[k.length - 1];
}

// --- Audio
export const AUDIO_DURATION = 80;
export const AUDIO_SPEAKERS = {
  control: { name: "Control", color: "#4F8CFF", text: "text-primary" },
  diego: { name: "Diego Vargas", color: "#EF4444", text: "text-critico" },
  lucia: { name: "Lucía Méndez", color: "#EAB308", text: "text-atencion" },
} as const;
export type Speaker = keyof typeof AUDIO_SPEAKERS;
export const AUDIO_LINES: { t: number; end: number; who: Speaker; text: string; evidence?: boolean }[] = [
  { t: 8, end: 13, who: "control", text: "Diego, ¿cómo te sientes después de la sesión de ejercicio?" },
  { t: 14, end: 27, who: "diego", text: "Un poco cansado… me cuesta respirar al terminar.", evidence: true },
  { t: 31, end: 40, who: "lucia", text: "Le veo el pulso alto en el panel, ronda los 115." },
  { t: 45, end: 55, who: "control", text: "Recibido. Descanso de 20 minutos y nueva medición de SpO₂." },
  { t: 62, end: 72, who: "diego", text: "Entendido, voy al módulo médico. *tose*", evidence: true },
];
export const AUDIO_FINDINGS = [
  { label: "Disnea leve en la voz", ev: "Evidencia 00:14 – 00:20", at: 20, conf: 81, bar: "bg-critico", text: "text-critico" },
  { label: "Tos seca", ev: "Evidencia 01:08", at: 68, conf: 74, bar: "bg-advertencia", text: "text-advertencia" },
  { label: "Ritmo de habla reducido", ev: "Comparado con su línea base", at: 30, conf: 68, bar: "bg-atencion", text: "text-atencion" },
];

// --- Evaluación
export const EVAL_METRICS = [
  { label: "Precisión", value: 94, suffix: " %", decimals: 0, hint: "Alertas correctas sobre el total emitido" },
  { label: "Sensibilidad", value: 91, suffix: " %", decimals: 0, hint: "Eventos reales que el modelo detectó" },
  { label: "Especificidad", value: 96, suffix: " %", decimals: 0, hint: "Casos normales sin falsa alarma" },
  { label: "F1", value: 0.92, suffix: "", decimals: 2, hint: "Equilibrio entre precisión y sensibilidad" },
];
export const EVAL_BY_SCENARIO = [
  { name: "Arritmia EVA", ia: 2.1, doctor: 5.4 },
  { name: "Hipoxia", ia: 3.4, doctor: 6.1 },
  { name: "Fatiga", ia: 9.8, doctor: 14.2 },
  { name: "Fiebre", ia: 4.6, doctor: 5.0 },
  { name: "Tormenta solar", ia: 1.8, doctor: 3.2 },
];
export const EVAL_VERSIONS = [
  { v: "v0.3", date: "09 nov 2026", acc: 94, note: "Más datos de EVA", current: true },
  { v: "v0.2", date: "21 oct 2026", acc: 89, note: "Clasificador de fatiga", current: false },
  { v: "v0.1", date: "30 sep 2026", acc: 81, note: "Primer modelo", current: false },
];
