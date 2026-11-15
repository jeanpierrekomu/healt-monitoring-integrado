// Traducción de lo que escribe el backend (en inglés y con etiquetas técnicas) a textos para la interfaz.
// Sirve tanto en el servidor como en el navegador.
import type { Status } from "@/lib/types";

/** Prioridad del backend → estado del frontend (crítico = alerta máxima, advertencia = grave, atención = leve). */
export const PRIORITY_TO_STATUS: Record<string, Status> = { critical: "critico", urgent: "critico", high: "advertencia", medium: "atencion", low: "atencion", info: "normal" };

const POSE: Record<string, string> = { standing: "de pie", sitting: "sentado", lying: "acostado", walking: "caminando" };
const STATE: Record<string, string> = { NORMAL: "normal", SLEEP_REM_DETECTED: "sueño REM", interaction: "interacción" };

/** Nombre legible de una etiqueta del modelo, p. ej. SLEEP_REM_DETECTED → "Sueño REM detectado". */
export function labelText(code: string) {
  const known: Record<string, string> = {
    SLEEP_REM_DETECTED: "Sueño REM detectado",
    interaction: "Interacción detectada",
    vitals: "Signos vitales",
    NORMAL: "Normal",
  };
  if (known[code]) return known[code];
  const t = code.replace(/_/g, " ").toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export type ReasonKind = "sleep" | "vision" | "fusion" | "other";

/** Saca título, valor y tipo del texto libre `reason` de una alerta del backend. */
export function describeReason(reason: string): { kind: ReasonKind; title: string; value: string } {
  const code = reason.match(/^\[([^\]]+)\]/)?.[1] ?? "";
  if (reason.includes("MULTIMODAL") || reason.includes("Cross-module")) {
    const parts = [...reason.matchAll(/(physio|vision|audio)=([A-Za-z_]+)/g)].map(([, k, v]) => {
      const name = k === "physio" ? "físico" : k === "vision" ? "visión" : "audio";
      return `${name}: ${STATE[v] ?? v.toLowerCase()}`;
    });
    return { kind: "fusion", title: "Correlación entre módulos", value: parts.join(" · ") || "—" };
  }
  if (reason.includes("Vision event")) {
    const pose = reason.match(/pose=([a-z_]+)/)?.[1];
    const dist = reason.match(/dist=([\d.]+)m/)?.[1];
    const bits = [pose ? (POSE[pose] ?? pose) : null, dist ? `a ${dist} m` : null].filter(Boolean);
    return { kind: "vision", title: "Evento de visión", value: bits.join(" · ") || "—" };
  }
  const hr = reason.match(/HR=([\d.]+)/)?.[1];
  const spo2 = reason.match(/SpO2=([\d.]+)/)?.[1];
  const value = [hr ? `${hr} lpm` : null, spo2 ? `SpO₂ ${spo2} %` : null].filter(Boolean).join(" · ") || "—";
  if (code.startsWith("SLEEP")) return { kind: "sleep", title: labelText(code), value };
  return { kind: "other", title: code ? labelText(code) : "Alerta del modelo", value };
}
