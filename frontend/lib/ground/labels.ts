// Cómo se interpretan los valores de texto de la base (estados, severidad, procedencia…).
// La base no publica la lista de valores permitidos, así que se reconocen por palabra clave
// en español o inglés. Un valor que no se reconoce se muestra tal cual.

export type Provenance = "real" | "reconstructed" | "synthetic" | "unknown";

/** Procedencia del dato: medición real, reconstrucción de un hecho histórico o dato sintético. */
export function provenanceOf(v: unknown): Provenance {
  const s = String(v ?? "").toLowerCase();
  if (!s) return "unknown";
  if (/sint|synth|simul|generat|demo|fake/.test(s)) return "synthetic";
  if (/recon|estim|infer|derived|deriv|approx|model/.test(s)) return "reconstructed";
  if (/real|measur|medid|device|disposit|sensor|live|hardware|original|observ|wearable/.test(s)) return "real";
  return "unknown";
}

export type Level = "normal" | "atencion" | "advertencia" | "critico";

export function severityOf(v: unknown): Level {
  const s = String(v ?? "").toLowerCase();
  if (/crit|sever|emerg|grave|max|life/.test(s)) return "critico";
  if (/high|alta|alto|warn|advert|major/.test(s)) return "advertencia";
  if (/med|moder|caution|precau|aten|low|baja|bajo|leve|minor/.test(s)) return "atencion";
  return "normal";
}

export type AlertState = "open" | "acknowledged" | "resolved" | "unknown";
export function alertStateOf(a: { alert_status?: unknown; acknowledged_at?: unknown; resolved_at?: unknown }): AlertState {
  const s = String(a.alert_status ?? "").toLowerCase();
  if (a.resolved_at || /resol|close|cerr|done|dismiss/.test(s)) return "resolved";
  if (a.acknowledged_at || /ack|recon|review|revis|progress/.test(s)) return "acknowledged";
  if (/open|abiert|activ|pend|new|nuev|trigger/.test(s)) return "open";
  return s ? "unknown" : "open";
}

export type MissionOrigin = "historical" | "custom" | "unknown";
export function missionOriginOf(m: { mission_origin?: unknown; mission_type?: unknown }): MissionOrigin {
  const s = `${m.mission_origin ?? ""} ${m.mission_type ?? ""}`.toLowerCase();
  if (/hist/.test(s)) return "historical";
  if (/custom|personal|user|usuario|simul|ficti|hypo|propuest|plan/.test(s)) return "custom";
  return "unknown";
}

export type MissionStatus = "active" | "completed" | "planned" | "cancelled" | "unknown";
export function missionStatusOf(v: unknown): MissionStatus {
  const s = String(v ?? "").toLowerCase();
  if (/activ|progress|curso|ongoing|live|flight|vuelo/.test(s)) return "active";
  if (/complet|finish|ended|conclu|termin|return/.test(s)) return "completed";
  if (/plan|sched|upcoming|future|prepar|draft|borrador/.test(s)) return "planned";
  if (/cancel|abort|fail|scrub/.test(s)) return "cancelled";
  return "unknown";
}

/** Certeza documental de un evento histórico. */
export type Certainty = "documented" | "reconstructed" | "unknown";
export function certaintyOf(v: unknown): Certainty {
  const s = String(v ?? "").toLowerCase();
  if (/recon|estim|infer|approx|hypo|probab|partial|parcial|low|baja|medium|media|uncertain/.test(s)) return "reconstructed";
  if (/doc|confirm|verif|high|alta|certain|official|oficial|primary/.test(s)) return "documented";
  return "unknown";
}

/** Texto legible para valores que pueden ser texto, lista u objeto (formación, especializaciones…). */
export function asText(v: unknown): string {
  if (v === null || v === undefined || v === "") return "";
  if (Array.isArray(v)) return v.map(asText).filter(Boolean).join(" · ");
  if (typeof v === "object") return Object.entries(v as Record<string, unknown>).map(([k, x]) => `${k}: ${asText(x)}`).join(" · ");
  return String(v);
}
export function asList(v: unknown): string[] {
  if (v === null || v === undefined || v === "") return [];
  if (Array.isArray(v)) return v.map(asText).filter(Boolean);
  if (typeof v === "string") return v.split(/[,;\n·]+/).map((x) => x.trim()).filter(Boolean);
  return [asText(v)];
}

export function fmtDate(v: string | null | undefined, withTime = false) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString("es-PE", withTime ? { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false } : { day: "2-digit", month: "short", year: "numeric" });
}

/** Número con unidad; null se muestra como "Sin dato" (nunca como cero). */
export function fmtNum(v: number | null | undefined, unit = "", decimals = 0) {
  if (v === null || v === undefined || Number.isNaN(v)) return "Sin dato";
  return `${v.toFixed(decimals)}${unit ? ` ${unit}` : ""}`;
}

export function daysBetween(a: string | null | undefined, b: string | null | undefined) {
  if (!a || !b) return null;
  const d = (new Date(b).getTime() - new Date(a).getTime()) / 86_400_000;
  return Number.isFinite(d) && d >= 0 ? Math.round(d) : null;
}
