// Indicadores del panel principal, todos leídos de la base.
import { supabase } from "@/lib/supabase";
import type { HealthAlert, HistoricalEvent, ImportBatch, Mission, SimulationSession } from "@/types/database";
import { count, rows } from "./core";

export async function getDashboard() {
  const t0 = performance.now();
  const [missions, astronauts, alerts, events, sessions, batches, telemetry] = await Promise.all([
    rows<Pick<Mission, "id" | "mission_status">>(supabase().from("missions").select("id,mission_status").limit(5000)),
    count("astronauts"),
    rows<Pick<HealthAlert, "id" | "severity">>(supabase().from("health_alerts").select("id,severity").limit(10_000)),
    rows<HistoricalEvent>(supabase().from("historical_events").select("*").order("occurred_at", { ascending: false, nullsFirst: false }).limit(5)),
    rows<SimulationSession>(supabase().from("simulation_sessions").select("*").order("started_at", { ascending: false, nullsFirst: false }).limit(5)),
    rows<ImportBatch>(supabase().from("import_batches").select("*").order("started_at", { ascending: false, nullsFirst: false }).limit(1)),
    count("telemetry_records"),
  ]);
  return { missions, astronauts, alerts, events, sessions, lastImport: batches[0] ?? null, telemetry, latencyMs: Math.round(performance.now() - t0) };
}
