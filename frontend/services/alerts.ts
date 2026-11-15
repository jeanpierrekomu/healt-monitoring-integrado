import type { HealthAlert } from "@/lib/types";
import { backendAlerts } from "./backend";
import { alerts } from "./mock/data";

/** Alertas reales del backend; si no está disponible, las de ejemplo. */
export async function getAlerts(): Promise<HealthAlert[]> {
  return (await backendAlerts()) ?? alerts;
}

export async function getAlertsByAstronaut(astronautId: string): Promise<HealthAlert[]> {
  return (await getAlerts()).filter((a) => a.astronautId === astronautId);
}
