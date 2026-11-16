// Sesiones y escenarios de simulación (solo lectura: el navegador nunca guarda resultados).
import { supabase } from "@/lib/supabase";
import type { HealthBaseline, SimulationResult, SimulationScenario, SimulationSession, SimulationSessionScenario } from "@/types/database";
import { rows } from "./core";

export const getSessions = (missionId?: string) => {
  let q = supabase().from("simulation_sessions").select("*");
  if (missionId) q = q.eq("mission_id", missionId);
  return rows<SimulationSession>(q.order("started_at", { ascending: false, nullsFirst: false }).limit(200));
};
export const getScenarios = () => rows<SimulationScenario>(supabase().from("simulation_scenarios").select("*").order("name").limit(500));
export const getSessionScenarios = (sessionId: string) =>
  rows<SimulationSessionScenario>(supabase().from("simulation_session_scenarios").select("*").eq("session_id", sessionId).order("start_offset_seconds"));
export const getSessionBaselines = (sessionId: string) => rows<HealthBaseline>(supabase().from("health_baselines").select("*").eq("session_id", sessionId));
export const getResults = (sessionIds: string[]) =>
  sessionIds.length ? rows<SimulationResult>(supabase().from("simulation_results").select("*").in("session_id", sessionIds)) : Promise.resolve([] as SimulationResult[]);
