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

// ───────────── Escaneo local (solo frontend) ─────────────
// La cámara de este equipo detecta el cuerpo (MediaPipe Pose) y aquí se arma un escaneo con la misma
// forma que los del backend. Sirve para simular el proceso cuando la estación con cámara no está disponible.

export interface PosePoint {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

// Índice de cada articulación dentro de los 33 puntos de MediaPipe.
const POSE_INDEX: Record<string, number> = {
  nose: 0, left_eye: 2, right_eye: 5, left_ear: 7, right_ear: 8,
  left_shoulder: 11, right_shoulder: 12, left_elbow: 13, right_elbow: 14, left_wrist: 15, right_wrist: 16,
  left_hip: 23, right_hip: 24, left_knee: 25, right_knee: 26, left_ankle: 27, right_ankle: 28,
};

const deg = (rad: number) => (rad * 180) / Math.PI;
const round = (v: number, d = 2) => Number(v.toFixed(d));

/**
 * Convierte la pose detectada en un escaneo.
 * `image`: puntos sobre la foto (0 a 1). `world`: los mismos puntos en 3D, en metros, con origen en la cadera.
 * `aspect`: ancho/alto de la imagen. Los puntajes y el estado muscular son una ESTIMACIÓN a partir de la postura.
 */
export function scanFromPose(image: PosePoint[], world: PosePoint[], crewId: string, aspect: number): MuscleScan {
  // 3D: MediaPipe usa Y hacia abajo y Z hacia la cámara en negativo; el backend, Y arriba y Z hacia el pecho.
  const w = (name: string) => {
    const p = world[POSE_INDEX[name]];
    return { x: p.x, y: -p.y, z: -p.z, confidence: p.visibility ?? 0 };
  };
  const raw = Object.fromEntries(Object.keys(POSE_INDEX).map((k) => [k, w(k)]));
  const hip = { x: (raw.left_hip.x + raw.right_hip.x) / 2, y: (raw.left_hip.y + raw.right_hip.y) / 2, z: (raw.left_hip.z + raw.right_hip.z) / 2 };
  const shoulderY = (raw.left_shoulder.y + raw.right_shoulder.y) / 2;
  const T = Math.max(0.2, shoulderY - hip.y); // largo del torso en metros → pasa a valer 1
  const joints: Joints = Object.fromEntries(
    Object.entries(raw).map(([k, p]) => [k, { x: round((p.x - hip.x) / T, 4), y: round((p.y - hip.y) / T, 4), z: round((p.z - hip.z) / T, 4), confidence: round(p.confidence, 3) }]),
  );

  // Postura, medida sobre la foto (con el ancho corregido para que los ángulos sean reales).
  const i = (name: string) => ({ x: image[POSE_INDEX[name]].x * aspect, y: image[POSE_INDEX[name]].y });
  const tilt = (a: string, b: string) => {
    const p = i(a);
    const q = i(b);
    return Math.abs(deg(Math.atan2(q.y - p.y, Math.abs(q.x - p.x))));
  };
  const shL = i("left_shoulder"), shR = i("right_shoulder"), hpL = i("left_hip"), hpR = i("right_hip"), nose = i("nose");
  const shMid = { x: (shL.x + shR.x) / 2, y: (shL.y + shR.y) / 2 };
  const hpMid = { x: (hpL.x + hpR.x) / 2, y: (hpL.y + hpR.y) / 2 };
  const torso2d = Math.max(0.05, Math.hypot(shMid.x - hpMid.x, shMid.y - hpMid.y));
  // Si la cadera queda fuera de cuadro, el detector la supone: no se mide ni pelvis ni columna.
  const hipsSeen = (joints.left_hip.confidence ?? 0) > 0.5 && (joints.right_hip.confidence ?? 0) > 0.5;
  const shoulderTilt = tilt("left_shoulder", "right_shoulder");
  const pelvicTilt = hipsSeen ? tilt("left_hip", "right_hip") : 0;
  const spine = hipsSeen ? (Math.abs(shMid.x - hpMid.x) / torso2d) * 100 : 0;
  const head = (Math.abs(nose.x - shMid.x) / torso2d) * 100;
  const d3 = (a: string, b: string) => Math.hypot(joints[a].x - joints[b].x, joints[a].y - joints[b].y, joints[a].z - joints[b].z);
  const legL = d3("left_hip", "left_knee") + d3("left_knee", "left_ankle");
  const legR = d3("right_hip", "right_knee") + d3("right_knee", "right_ankle");
  // Si las piernas no se ven en la foto, sus puntos son una suposición del detector: no se usan.
  const legsSeen = ["left_knee", "right_knee", "left_ankle", "right_ankle"].every((k) => (joints[k].confidence ?? 0) > 0.5);
  const legGap = legsSeen ? (Math.abs(legL - legR) / Math.max(0.1, (legL + legR) / 2)) * 100 : 0;

  // Puntaje de simetría (0 a 100): baja con cada desviación. Fórmula de ejemplo.
  const score = Math.max(0, Math.min(100, 100 - shoulderTilt * 2.2 - pelvicTilt * 2.2 - spine * 1.2 - head * 0.4 - legGap * 0.3));
  const level = (v: number, moderate: number, elevated: number): MuscleLevel => (v >= elevated ? "elevated" : v >= moderate ? "moderate" : "optimal");

  return {
    id: -Date.now(), // id negativo: no existe en el backend
    crew_member_id: crewId,
    created_at: new Date().toISOString(),
    blue_suit_verified: false,
    posture_symmetry_score: round(score),
    biomechanical_metrics: {
      shoulder_tilt_deg: round(shoulderTilt),
      pelvic_tilt_deg: round(pelvicTilt),
      spinal_lateral_deviation_pct: round(spine),
      head_alignment_offset_px: round(head),
      shoulder_to_torso_ratio: round(d3("left_shoulder", "right_shoulder"), 3),
      hip_to_torso_ratio: round(d3("left_hip", "right_hip"), 3),
      // Una postura torcida carga más los músculos de ese lado: de ahí sale el nivel estimado.
      muscle_group_status: {
        cervical_trapezius: level(head, 10, 20),
        pectoralis_deltoids: level(shoulderTilt, 3, 6),
        ...(hipsSeen
          ? {
              rectus_abdominis_obliques: level(spine, 5, 10),
              erector_spinae_lumbar: level(spine, 3, 6),
              gluteus_pelvic_stabilizers: level(pelvicTilt, 3, 6),
            }
          : {}),
        ...(legsSeen ? { quadriceps_gastrocnemius: level(legGap, 6, 12) } : {}),
      },
    },
    skeleton_3d_joints: joints,
    snapshot_url: null,
  };
}
