// Tablas de la base actual de Supabase. Solo incluye columnas CONFIRMADAS contra la base
// (cada una se comprobó consultándola). Puede haber más columnas: no se usan hasta confirmarlas.
// Los tipos de texto libre o de lista (formación, especializaciones, banderas) se tratan como `unknown`
// y se muestran con un formateador que acepta texto, listas u objetos.

export type UUID = string;
type Txt = string | null;
type Num = number | null;
type When = string | null;

export interface Agency { id: UUID; name: Txt; acronym?: Txt; country: Txt; website: Txt; created_at: When }
export interface Astronaut {
  id: UUID; agency_id: Txt; full_name: Txt; nationality: Txt; gender: Txt; birth_date: When; career_status: Txt;
  is_active: boolean | null; selection_date: When; biography: Txt; image_path: Txt; created_at: When; updated_at: When;
}
export interface AstronautProfile { id: UUID; astronaut_id: Txt; education: unknown; specializations: unknown; updated_at: When }
export interface Spaceship { id: UUID; agency_id: Txt; name: Txt; vehicle_type: Txt; manufacturer: Txt; description: Txt; image_path: Txt; created_at: When }
export interface Device {
  id: UUID; device_code: Txt; device_name: Txt; device_type: Txt; manufacturer: Txt; firmware_version: Txt; status: Txt;
  description: Txt; image_path: Txt; created_at: When;
}
export interface Mission {
  id: UUID; agency_id: Txt; spaceship_id: Txt; name: Txt; mission_code: Txt; mission_type: Txt; mission_origin: Txt; mission_status: Txt;
  destination: Txt; objective: Txt; description: Txt; launch_date: When; return_date: When; created_at: When;
}
export interface MissionCrew { id: UUID; mission_id: Txt; astronaut_id: Txt; mission_role: Txt; created_at: When }
export interface MissionSupportStaff { id: UUID; mission_id: Txt; full_name: Txt; support_role: Txt; description: Txt; created_at: When }
export interface DataSource {
  id: UUID; source_name: Txt; source_type: Txt; organization: Txt; source_url: Txt; description: Txt; publication_date: When;
  access_date: When; import_batch_id: Txt; created_at: When;
}
export interface MissionSource { id: UUID; mission_id: Txt; source_id: Txt }
export interface HistoricalEvent {
  id: UUID; mission_id: Txt; astronaut_id: Txt; event_title: Txt; event_description: Txt; event_category: Txt; severity: Txt;
  certainty: Txt; occurred_at: When; created_at: When;
}
export interface HistoricalEventSource { id: UUID; historical_event_id: Txt; source_id: Txt }
export interface SimulationSession { id: UUID; mission_id: Txt; session_status: Txt; random_seed: number | string | null; started_at: When; completed_at: When; created_at: When }
export interface SimulationScenario { id: UUID; scenario_code: Txt; name: Txt; category: Txt; description: Txt; is_active: boolean | null; created_at: When }
export interface SimulationSessionScenario {
  id: UUID; session_id: Txt; scenario_id: Txt; astronaut_id: Txt; start_offset_seconds: Num; duration_seconds: Num; created_at: When;
}
export interface SimulationEvent {
  id: UUID; session_id: Txt; astronaut_id: Txt; historical_event_id: Txt; event_type: Txt; description: Txt; provenance: Txt;
  simulated_at: When; created_at: When;
}
export interface HealthBaseline {
  id: UUID; astronaut_id: Txt; session_id: Txt; heart_rate_min: Num; heart_rate_max: Num; spo2_min: Num; spo2_max: Num;
  temperature_min: Num; temperature_max: Num; respiratory_rate_min: Num; respiratory_rate_max: Num;
}
export interface TelemetryRecord {
  id: UUID; mission_id: Txt; session_id: Txt; astronaut_id: Txt; device_id: Txt; recorded_at: When; received_at: When; source_type: Txt;
  heart_rate: Num; spo2: Num; body_temperature: Num; respiratory_rate: Num; systolic_pressure: Num; diastolic_pressure: Num;
  acceleration_x: Num; acceleration_y: Num; acceleration_z: Num; gyroscope_x: Num; gyroscope_y: Num; gyroscope_z: Num;
  activity_state: Txt; signal_quality: Txt | number; quality_flags: unknown; created_at: When;
}
export interface HealthAlert {
  id: UUID; session_id: Txt; astronaut_id: Txt; simulation_event_id: Txt; alert_code: Txt; alert_category: Txt; title: Txt;
  description: Txt; severity: Txt; alert_status: Txt; triggered_at: When; acknowledged_at: When; resolved_at: When; created_at: When;
}
export interface AlertEvidence { id: UUID; alert_id: Txt; telemetry_record_id: Txt; evidence_role: Txt; created_at: When }
export interface MedicalIntervention { id: UUID; alert_id: Txt; intervention_type: Txt; description: Txt; outcome: Txt; executed_at: When; created_at: When }
export interface SimulationResult { id: UUID; session_id: Txt; total_alerts: Num; critical_alerts: Num }
export interface ImportBatch { id: UUID; file_name: Txt; records_inserted: Num; started_at: When; completed_at: When; created_at: When }
