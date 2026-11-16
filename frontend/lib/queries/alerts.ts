// Alertas, evidencias e intervenciones.
import { supabase } from "@/lib/supabase";
import type { AlertEvidence, HealthAlert, MedicalIntervention, SimulationEvent } from "@/types/database";
import { one, rows } from "./core";

export const ALERTS_LIMIT = 1000;

export const getAlerts = (opts: { astronautId?: string } = {}) => {
  let q = supabase().from("health_alerts").select("*");
  if (opts.astronautId) q = q.eq("astronaut_id", opts.astronautId);
  return rows<HealthAlert>(q.order("triggered_at", { ascending: false, nullsFirst: false }).limit(ALERTS_LIMIT));
};
export const getEvidence = (alertId: string) => rows<AlertEvidence>(supabase().from("alert_evidence").select("*").eq("alert_id", alertId));
export const getInterventions = (alertId: string) =>
  rows<MedicalIntervention>(supabase().from("medical_interventions").select("*").eq("alert_id", alertId).order("executed_at", { ascending: true, nullsFirst: false }));
export const getSimulationEvent = (id: string) => one<SimulationEvent>(supabase().from("simulation_events").select("*").eq("id", id).maybeSingle());
