import type { Mission } from "@/lib/types";
import { backendAstronauts, backendMissions } from "./backend";
import { missions } from "./mock/data";

/**
 * Misiones reales del backend. Mientras no haya ninguna cargada, se muestran las de ejemplo
 * pero con la tripulación real (para que no aparezcan astronautas que no existen).
 */
export async function getMissions(): Promise<Mission[]> {
  const real = await backendMissions();
  if (real) return real;
  const crew = await backendAstronauts();
  if (!crew) return missions;
  const ids = crew.map((c) => c.id);
  return missions.map((m, i) => ({ ...m, crew: i === 0 ? ids : ids.slice(0, Math.max(1, Math.min(ids.length, m.crew.length))) }));
}
