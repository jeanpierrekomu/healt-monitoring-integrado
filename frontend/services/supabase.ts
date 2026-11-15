// Conexión al backend (Supabase). Se usa la clave PUBLICABLE, que está pensada para el navegador.
// Si no hay variables de entorno o el backend no responde, los servicios vuelven a los datos de ejemplo.
export const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_KEY ?? "";
export const HAS_BACKEND = Boolean(SB_URL && SB_KEY);

/** Lee filas de una tabla. `query` va en formato PostgREST, p. ej. "select=*&order=id.desc&limit=50". */
export async function sbSelect<T>(table: string, query: string): Promise<T[]> {
  if (!HAS_BACKEND) throw new Error("Backend no configurado");
  const res = await fetch(`${SB_URL}/rest/v1/${table}?${query}`, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, Accept: "application/json" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Supabase ${table}: ${res.status}`);
  return (await res.json()) as T[];
}

/** Inserta una fila. Solo se usa cuando el usuario pulsa un botón que lo pide (p. ej. pedir un escaneo). */
export async function sbInsert(table: string, row: Record<string, unknown>): Promise<void> {
  if (!HAS_BACKEND) throw new Error("Backend no configurado");
  const res = await fetch(`${SB_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(row),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Supabase ${table}: ${res.status}`);
}

// Filas tal como las entrega el backend (solo las columnas que usa el frontend).
export interface CrewRow {
  id: string;
  code: string;
  display_name: string;
  crew_role: string;
  public_profile: { bio?: string | null; name?: string | null; agency?: string | null; photo_url?: string | null; source_url?: string | null } | null;
}
export interface AlertRow {
  id: number;
  crew_member_id: string | null;
  priority: string;
  status: string;
  reason: string;
  created_at: string;
}
export interface ReadingRow {
  crew_member_id: string | null;
  heart_rate_bpm: number | null;
  spo2_pct: number | null;
  contact_temperature_c: number | null;
  received_at: string;
}
export interface MissionRow {
  id: string;
  name: string;
  status: string;
  started_at: string;
  ended_at: string | null;
  mission_members?: { crew_member_id: string }[];
}
export interface FindingRow {
  id: number;
  crew_member_id: string | null;
  kind: string;
  label: string;
  confidence: number;
  start_s: number;
  end_s: number;
  evidence: { media_ref?: string | null; description?: string } | null;
  review_status: string;
  model_runs?: { model_name: string; modality: string; started_at: string } | null;
}
