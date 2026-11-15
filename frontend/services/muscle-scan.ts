// Gemelo muscular: escaneos que la estación con cámara guarda en `musculoskeletal_scans`.
// El frontend solo lee esa tabla y, cuando el médico lo pide, deja un comando en `scan_commands`
// para que la estación haga un escaneo nuevo. Nunca habla directo con la cámara.
import { sbInsert, sbSelect } from "./supabase";

export interface Joint {
  x: number;
  y: number;
  z: number;
  confidence?: number;
}
/** 17 articulaciones. Ejes: +Y arriba, +Z hacia el pecho, origen en el centro de la pelvis; el torso mide ~1. */
export type Joints = Record<string, Joint>;

export interface Proportions {
  widths?: { biacromial_shoulder_width?: number; waist_width_estimated?: number; biiliac_hip_width?: number };
  depths_z?: { chest_anteroposterior_depth?: number; waist_anteroposterior_depth?: number; pelvis_anteroposterior_depth?: number };
  segment_lengths?: Record<string, number>;
}

export interface MuscleScan {
  id: number;
  crew_member_id: string;
  created_at: string;
  blue_suit_verified: boolean;
  posture_symmetry_score: number;
  biomechanical_metrics: {
    pelvic_tilt_deg?: number;
    shoulder_tilt_deg?: number;
    spinal_lateral_deviation_pct?: number;
    head_alignment_offset_px?: number;
    shoulder_to_torso_ratio?: number;
    hip_to_torso_ratio?: number;
    muscle_group_status?: Record<string, string>;
    anatomical_proportions?: Proportions;
  };
  skeleton_3d_joints: Joints;
  snapshot_url: string | null;
}

export type MuscleLevel = "optimal" | "moderate" | "elevated";
export type MuscleGroup = "neck" | "chest" | "abs" | "back" | "glutes" | "legs";

export const GROUP_LABEL: Record<MuscleGroup, string> = {
  neck: "Cuello y trapecio",
  chest: "Pectorales y deltoides",
  abs: "Abdominales y oblicuos",
  back: "Espalda baja (erectores)",
  glutes: "Glúteos y pelvis",
  legs: "Cuádriceps y gemelos",
};
export const LEVEL_LABEL: Record<MuscleLevel, string> = { optimal: "Óptimo", moderate: "Carga moderada", elevated: "Carga elevada" };
/** Color de cada nivel sobre el modelo: rojo natural, naranja y amarillo brillante. */
export const LEVEL_COLOR: Record<MuscleLevel, string> = { optimal: "#c41f1a", moderate: "#ff8c1a", elevated: "#ffe14a" };

/** El backend ha cambiado los nombres de los grupos entre versiones: se reconocen por palabra clave. */
function groupOf(key: string): MuscleGroup | null {
  const k = key.toLowerCase();
  if (k.includes("cervical") || k.includes("trapez")) return "neck";
  if (k.includes("pector") || k.includes("deltoid")) return "chest";
  if (k.includes("abdom") || k.includes("obliq")) return "abs";
  if (k.includes("erector") || k.includes("lumbar") || k.includes("spinae")) return "back";
  if (k.includes("glute") || k.includes("pelvic")) return "glutes";
  if (k.includes("quadri") || k.includes("gastro") || k.includes("hamstr")) return "legs";
  return null;
}

const RANK: Record<MuscleLevel, number> = { optimal: 0, moderate: 1, elevated: 2 };

/** Estado de cada grupo muscular del modelo 3D (si dos claves caen en el mismo grupo, gana la peor). */
export function muscleLevels(scan: MuscleScan | null): Partial<Record<MuscleGroup, MuscleLevel>> {
  const out: Partial<Record<MuscleGroup, MuscleLevel>> = {};
  for (const [key, raw] of Object.entries(scan?.biomechanical_metrics.muscle_group_status ?? {})) {
    const g = groupOf(key);
    const level = (["optimal", "moderate", "elevated"] as const).find((l) => l === raw);
    if (!g || !level) continue;
    if (!out[g] || RANK[level] > RANK[out[g]!]) out[g] = level;
  }
  return out;
}

/** Último escaneo de un tripulante (null si no tiene). */
export async function fetchLatestScan(crewId: string): Promise<MuscleScan | null> {
  const rows = await sbSelect<MuscleScan>("musculoskeletal_scans", `select=*&crew_member_id=eq.${encodeURIComponent(crewId)}&order=created_at.desc&limit=1`);
  return rows[0] ?? null;
}

/** Cuántos escaneos tiene guardados un tripulante. */
export async function fetchScanCount(crewId: string): Promise<number> {
  const rows = await sbSelect<{ id: number }>("musculoskeletal_scans", `select=id&crew_member_id=eq.${encodeURIComponent(crewId)}&limit=500`);
  return rows.length;
}

/** Pide a la estación con cámara un escaneo nuevo ("Iniciar reconstrucción profunda"). */
export async function requestDeepScan(crewId: string): Promise<void> {
  await sbInsert("scan_commands", { crew_member_id: crewId, command: "start_deep_reconstruction", status: "pending" });
}

/** Postura de referencia para mostrar el modelo cuando un tripulante todavía no tiene escaneos. */
export const DEFAULT_JOINTS: Joints = {
  nose: { x: 0, y: 1.43, z: 0.11 },
  left_eye: { x: 0.06, y: 1.48, z: 0.11 },
  right_eye: { x: -0.06, y: 1.48, z: 0.11 },
  left_ear: { x: 0.16, y: 1.42, z: 0 },
  right_ear: { x: -0.16, y: 1.42, z: 0 },
  left_shoulder: { x: 0.295, y: 1, z: 0.02 },
  right_shoulder: { x: -0.295, y: 1, z: 0.02 },
  left_elbow: { x: 0.42, y: 0.51, z: -0.05 },
  right_elbow: { x: -0.42, y: 0.51, z: -0.05 },
  left_wrist: { x: 0.385, y: 0.09, z: 0.06 },
  right_wrist: { x: -0.385, y: 0.09, z: 0.06 },
  left_hip: { x: 0.19, y: 0, z: 0 },
  right_hip: { x: -0.19, y: 0, z: 0 },
  left_knee: { x: 0.19, y: -0.69, z: 0.04 },
  right_knee: { x: -0.19, y: -0.69, z: 0.04 },
  left_ankle: { x: 0.16, y: -1.24, z: 0 },
  right_ankle: { x: -0.16, y: -1.24, z: 0 },
};
