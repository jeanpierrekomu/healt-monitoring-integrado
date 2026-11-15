// Acciones sobre alertas que se llaman desde el navegador.
import type { ReviewState } from "@/lib/types";

/**
 * Guarda la revisión médica de una alerta.
 * Por ahora solo cambia en pantalla: escribir en el backend (tabla alert_reviews) queda pendiente
 * hasta acordar con el equipo los valores permitidos y los permisos de la clave pública.
 */
export async function updateAlertReview(id: string, review: ReviewState): Promise<void> {
  void id;
  void review;
}
