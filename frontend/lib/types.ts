// Tipos compartidos de la plataforma. Backend y frontend deben respetar estas formas.

export type Status = "normal" | "atencion" | "advertencia" | "critico";

export type DataSource = "Wearable" | "Bio-sensor" | "Manual" | "Modelo IA";

export type VitalKey = "hr" | "hrv" | "spo2" | "temp";

export interface Vitals {
  hr: number;
  hrv: number;
  spo2: number;
  temp: number;
}

/** Sexo biológico: cambia algunos rangos de referencia (pulso en reposo, temperatura). */
export type Sex = "F" | "M";

export interface Astronaut {
  id: string;
  initials: string;
  name: string;
  role: string;
  agency: string;
  origin: string;
  age: number;
  previousMissions: string[];
  evaHours: number;
  bloodType: string;
  profileSource: string;
  status: Status;
  sex: Sex;
  vitals: Vitals;
  /** Valores normales de ESTA persona en reposo (medidos antes del vuelo). Las alertas comparan contra ellos. */
  baseline: Vitals;
  missionId: string;
  notes: string;
}

export type ReviewState = "pendiente" | "en-revision" | "resuelta";

export interface HealthAlert {
  id: string;
  severity: Status;
  astronautId: string;
  title: string;
  variable: string;
  value: string;
  source: DataSource;
  time: string;
  ago: string;
  review: ReviewState;
  /** Texto original del backend (motivo técnico de la alerta), si viene de ahí. */
  detail?: string;
  /** Cuántas veces se repitió la misma alerta (las repetidas se muestran juntas). */
  count?: number;
}

export type MissionStatus = "en-curso" | "planificada" | "completada";

export interface MissionPhase {
  name: string;
  date: string;
  state: "done" | "now" | "next";
}

export interface Mission {
  id: string;
  name: string;
  status: MissionStatus;
  destination: string;
  dates: string;
  progressLabel: string;
  progress: number;
  crew: string[];
  stats: { label: string; value: string }[];
  phases: MissionPhase[];
}

export type Difficulty = "Alta" | "Media" | "Baja";

export interface Scenario {
  id: string;
  name: string;
  category: "Cardiovascular" | "Respiratorio" | "Ambiental" | "Conductual";
  icon: "heart" | "droplet" | "activity" | "waves" | "thermometer" | "shield";
  description: string;
  duration: string;
  crewCount: number;
  difficulty: Difficulty;
  lastRun: string;
}

export type Role = "Médico" | "Investigador" | "Administrador" | "Observador";

export interface PlatformUser {
  id: string;
  initials: string;
  name: string;
  email: string;
  role: Role;
  state: "Activo" | "Invitación pendiente" | "Inactivo";
  lastAccess: string;
}

export interface VitalConfig {
  key: VitalKey;
  label: string;
  short: string;
  unit: string;
  min: number;
  max: number;
  decimals: number;
  source: string;
}
