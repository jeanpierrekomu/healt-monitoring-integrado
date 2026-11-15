// Detector corporal (MediaPipe Pose). Corre en el propio navegador: el video no sale del equipo.
// Se carga una sola vez por modalidad (pesa unos megas) y se reutiliza entre pantallas.
import type { PoseLandmarker } from "@mediapipe/tasks-vision";

const cache = new Map<string, Promise<PoseLandmarker>>();

/**
 * `masks: true` devuelve también la silueta de la persona (más lento); sin ella solo los puntos del cuerpo.
 * `people` es cuántas personas se siguen a la vez.
 */
export function loadPose({ masks, people = 1 }: { masks: boolean; people?: number }) {
  const key = `${masks}-${people}`;
  let p = cache.get(key);
  if (!p) {
    p = (async () => {
      const { FilesetResolver, PoseLandmarker } = await import("@mediapipe/tasks-vision");
      const files = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
      const make = (delegate: "GPU" | "CPU") =>
        PoseLandmarker.createFromOptions(files, {
          baseOptions: { modelAssetPath: "/models/pose_landmarker_full.task", delegate },
          runningMode: "VIDEO",
          numPoses: people,
          outputSegmentationMasks: masks,
        });
      // Con silueta se usa el procesador: con la tarjeta gráfica la silueta llega vacía en algunos navegadores.
      if (masks) return make("CPU");
      try {
        return await make("GPU");
      } catch {
        return await make("CPU");
      }
    })();
    cache.set(key, p);
    p.catch(() => cache.delete(key));
  }
  return p;
}

/** Huesos que se dibujan entre los puntos del cuerpo. */
export const BONES = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28]];
/** Puntos principales: nariz, hombros, codos, muñecas, caderas, rodillas y tobillos. */
export const JOINTS = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
