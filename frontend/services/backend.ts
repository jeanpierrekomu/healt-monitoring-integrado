// Datos reales del backend, convertidos a las formas que ya usa el frontend. SOLO SERVIDOR.
// Cada lectura se guarda un minuto en caché: las páginas cargan rápido y los datos no envejecen más que eso.
import { cacheLife } from "next/cache";
import type { Astronaut, HealthAlert, Mission, ReviewState, Status } from "@/lib/types";
import { medicalProfile } from "./crew-profile";
import { describeReason, PRIORITY_TO_STATUS } from "./backend-text";
import { HAS_BACKEND, sbSelect, type AlertRow, type CrewRow, type FindingRow, type MissionRow, type ReadingRow } from "./supabase";

async function cached<T>(table: string, query: string): Promise<T[]> {
  "use cache";
  cacheLife("minutes");
  return sbSelect<T>(table, query);
}

/** Devuelve null si el backend no está configurado o no responde (el servicio usa entonces los datos de ejemplo). */
async function load<T>(table: string, query: string): Promise<T[] | null> {
  if (!HAS_BACKEND) return null;
  try {
    return await cached<T>(table, query);
  } catch (e) {
    console.warn(`[backend] ${table} no disponible, se usan datos de ejemplo:`, (e as Error).message);
    return null;
  }
}

const ROLE: Record<string, string> = {
  commander: "Comandante",
  doctor: "Médica de vuelo",
  engineer: "Ingeniero de vuelo",
  scientist: "Científica",
  pilot: "Piloto",
  specialist: "Especialista de misión",
};
const REVIEW: Record<string, ReviewState> = { open: "pendiente", acknowledged: "en-revision", in_review: "en-revision", reviewing: "en-revision" };
const RANK: Record<Status, number> = { normal: 0, atencion: 1, advertencia: 2, critico: 3 };

/** Nombre sin el título ("Dr. Elena Rostova" → "Elena Rostova"): el rol ya dice que es médica. */
const plainName = (name: string) => name.replace(/^(dr|dra)\.?\s+/i, "");
const initials = (name: string) => plainName(name).split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

function ago(iso: string) {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  if (min < 60 * 24) return `hace ${Math.round(min / 60)} h`;
  const d = Math.round(min / 1440);
  return d === 1 ? "ayer" : `hace ${d} días`;
}
const clock = (iso: string) => new Date(iso).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Lima" });

/**
 * Alertas del backend ya convertidas. Las repetidas (misma persona y mismo motivo) se juntan en una,
 * con la más reciente. Va en caché porque calcula "hace cuánto" con la hora actual.
 */
async function cachedAlerts(): Promise<HealthAlert[]> {
  "use cache";
  cacheLife("minutes");
  const rows = await sbSelect<AlertRow>("alerts", "select=*&order=created_at.desc&limit=400");
  const groups = new Map<string, { row: AlertRow; count: number }>();
  for (const r of rows) {
    if (!r.crew_member_id) continue;
    const d = describeReason(r.reason);
    const key = `${r.crew_member_id}|${d.title}|${r.status}`;
    const g = groups.get(key);
    if (g) g.count++;
    else groups.set(key, { row: r, count: 1 });
  }
  return [...groups.values()].map(({ row, count }) => {
    const d = describeReason(row.reason);
    return {
      id: String(row.id),
      severity: PRIORITY_TO_STATUS[row.priority] ?? "atencion",
      astronautId: row.crew_member_id!,
      title: d.title,
      variable: count > 1 ? `${d.title} (${count} veces)` : d.title,
      value: d.value,
      source: "Modelo IA",
      time: clock(row.created_at),
      ago: ago(row.created_at),
      review: REVIEW[row.status] ?? (row.status === "open" ? "pendiente" : "resuelta"),
      detail: row.reason,
      count,
    } satisfies HealthAlert;
  });
}

export async function backendAlerts(): Promise<HealthAlert[] | null> {
  if (!HAS_BACKEND) return null;
  try {
    return await cachedAlerts();
  } catch (e) {
    console.warn("[backend] alerts no disponible, se usan datos de ejemplo:", (e as Error).message);
    return null;
  }
}

/** Tripulación del backend, con su última lectura y su estado según las alertas abiertas. */
export async function backendAstronauts(): Promise<Astronaut[] | null> {
  const crew = await load<CrewRow>("crew_members", "select=id,code,display_name,crew_role,public_profile&order=code");
  if (!crew || !crew.length) return null;
  const [readings, alerts, members] = await Promise.all([
    load<ReadingRow>("readings", "select=crew_member_id,heart_rate_bpm,spo2_pct,contact_temperature_c,received_at&order=received_at.desc&limit=400"),
    backendAlerts(),
    load<{ mission_id: string; crew_member_id: string }>("mission_members", "select=mission_id,crew_member_id"),
  ]);
  return crew.map((c) => {
    const m = medicalProfile(c.id);
    const last = readings?.find((r) => r.crew_member_id === c.id);
    const open = (alerts ?? []).filter((a) => a.astronautId === c.id && a.review !== "resuelta");
    const status = open.reduce<Status>((worst, a) => (RANK[a.severity] > RANK[worst] ? a.severity : worst), "normal");
    return {
      id: c.id,
      initials: initials(c.display_name),
      name: plainName(c.display_name),
      role: ROLE[c.crew_role] ?? c.crew_role,
      agency: c.public_profile?.agency ?? "Sin dato",
      origin: m.origin,
      age: m.age,
      previousMissions: m.previousMissions,
      evaHours: m.evaHours,
      bloodType: m.bloodType,
      profileSource: c.public_profile?.source_url ? "Perfil público importado" : "Backend del equipo (Supabase)",
      status,
      sex: m.sex,
      baseline: m.baseline,
      // Última lectura real del dispositivo; si aún no hay lecturas, sus valores habituales.
      vitals: {
        hr: last?.heart_rate_bpm ?? m.baseline.hr,
        hrv: m.baseline.hrv, // el dispositivo no mide HRV
        spo2: last?.spo2_pct ?? m.baseline.spo2,
        temp: last?.contact_temperature_c ?? m.baseline.temp,
      },
      missionId: members?.find((x) => x.crew_member_id === c.id)?.mission_id ?? "artemis-h",
      notes: c.public_profile?.bio ?? "Sin notas.",
    } satisfies Astronaut;
  });
}

const MISSION_STATUS: Record<string, Mission["status"]> = { active: "en-curso", planned: "planificada", completed: "completada", ended: "completada", finished: "completada" };
const day = (iso: string) => new Date(iso).toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Lima" });

/** Misiones del backend (guarda nombre, estado y fechas). Devuelve null si no hay ninguna cargada. */
export async function backendMissions(): Promise<Mission[] | null> {
  const rows = await load<MissionRow>("missions", "select=id,name,status,started_at,ended_at,mission_members(crew_member_id)&order=started_at.desc");
  if (!rows || !rows.length) return null;
  return rows.map((r) => {
    const status = MISSION_STATUS[r.status] ?? "en-curso";
    return {
      id: r.id,
      name: r.name,
      status,
      destination: "Sin dato",
      dates: `${day(r.started_at)} – ${r.ended_at ? day(r.ended_at) : "en curso"}`,
      progressLabel: status === "completada" ? "Completada" : status === "planificada" ? "Planificada" : "En curso",
      progress: status === "completada" ? 100 : status === "planificada" ? 0 : 50,
      crew: (r.mission_members ?? []).map((m) => m.crew_member_id),
      stats: [{ label: "Tripulantes", value: String(r.mission_members?.length ?? 0) }],
      phases: [],
    } satisfies Mission;
  });
}

/** Hallazgos de los modelos de IA (físico, visión, audio y fusión). */
export async function backendFindings(): Promise<FindingRow[] | null> {
  return load<FindingRow>("findings", "select=id,crew_member_id,kind,label,confidence,start_s,end_s,evidence,review_status,model_runs(model_name,modality,started_at)&order=id.desc&limit=120");
}

/** Nombre de cada tripulante por su id (para tablas que solo traen el id). */
export async function backendCrewNames(): Promise<Record<string, string>> {
  const crew = await load<CrewRow>("crew_members", "select=id,code,display_name,crew_role,public_profile&order=code");
  return Object.fromEntries((crew ?? []).map((c) => [c.id, plainName(c.display_name)]));
}
