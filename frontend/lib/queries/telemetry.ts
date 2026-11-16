// Telemetría: solo el intervalo pedido (nunca la tabla entera).
import { supabase } from "@/lib/supabase";
import type { TelemetryRecord } from "@/types/database";
import { rows } from "./core";

export const TELEMETRY_LIMIT = 2000;

export async function getTelemetry(opts: { missionId?: string; astronautId?: string; from?: string; to?: string; limit?: number }) {
  let q = supabase().from("telemetry_records").select("*");
  if (opts.missionId) q = q.eq("mission_id", opts.missionId);
  if (opts.astronautId) q = q.eq("astronaut_id", opts.astronautId);
  if (opts.from) q = q.gte("recorded_at", opts.from);
  if (opts.to) q = q.lte("recorded_at", opts.to);
  return rows<TelemetryRecord>(q.order("recorded_at", { ascending: true }).limit(opts.limit ?? TELEMETRY_LIMIT));
}

/** Fecha del registro más reciente (para proponer el intervalo inicial). */
export async function getLatestTelemetryTime(opts: { missionId?: string; astronautId?: string }) {
  let q = supabase().from("telemetry_records").select("recorded_at");
  if (opts.missionId) q = q.eq("mission_id", opts.missionId);
  if (opts.astronautId) q = q.eq("astronaut_id", opts.astronautId);
  const list = await rows<{ recorded_at: string | null }>(q.not("recorded_at", "is", null).order("recorded_at", { ascending: false }).limit(1));
  return list[0]?.recorded_at ?? null;
}

export const getTelemetryByIds = (ids: string[]) =>
  ids.length ? rows<TelemetryRecord>(supabase().from("telemetry_records").select("*").in("id", ids)) : Promise.resolve([] as TelemetryRecord[]);

/** Solo las fechas de los últimos días, para el gráfico de actividad. */
export async function getTelemetryActivity(days = 30) {
  const from = new Date(Date.now() - days * 86_400_000).toISOString();
  return rows<{ recorded_at: string | null; source_type: string | null }>(
    supabase().from("telemetry_records").select("recorded_at,source_type").gte("recorded_at", from).order("recorded_at").limit(20_000),
  );
}

export async function countTelemetryByDevice(deviceId: string) {
  const { count, error } = await supabase().from("telemetry_records").select("id", { count: "exact", head: true }).eq("device_id", deviceId);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function countTelemetryByAstronaut(astronautId: string) {
  const { count, error } = await supabase().from("telemetry_records").select("id", { count: "exact", head: true }).eq("astronaut_id", astronautId);
  if (error) throw new Error(error.message);
  return count ?? 0;
}
