// Explicabilidad de la IA (mock): qué señales pesaron más en cada alerta.
// Se reemplaza por la respuesta del servicio de ML (ej. valores SHAP por alerta).

export interface Factor {
  label: string;
  weight: number; // 0–1, contribución relativa
  detail: string;
}

export interface Explanation {
  summary: string;
  confidence: number;
  factors: Factor[];
}

export const ALERT_EXPLANATIONS: Record<string, Explanation> = {
  a1: {
    summary: "La HR subió de 92 a 118 lpm en 8 minutos y se mantuvo alta en reposo, junto con una caída de HRV y SpO₂.",
    confidence: 0.94,
    factors: [
      { label: "HR sostenida > 110 lpm", weight: 0.46, detail: "8 min seguidos, ya en reposo" },
      { label: "Caída de HRV", weight: 0.24, detail: "−38 % frente a su línea base" },
      { label: "SpO₂ a la baja", weight: 0.17, detail: "de 96 % a 91 %" },
      { label: "Voz con disnea (audio)", weight: 0.13, detail: "Laboratorio de audio, 00:14" },
    ],
  },
  a2: {
    summary: "Dos lecturas de SpO₂ por debajo de 95 % separadas por 10 minutos, sin cambios en la cabina.",
    confidence: 0.86,
    factors: [
      { label: "SpO₂ < 95 % repetida", weight: 0.58, detail: "94 % y 93.8 %" },
      { label: "HR en aumento", weight: 0.22, detail: "+12 lpm" },
      { label: "Calidad del sensor", weight: 0.2, detail: "Señal aceptable (88 %), no parece un artefacto" },
    ],
  },
  a3: {
    summary: "La temperatura subió 0.5 °C en 6 h sin que haya hecho ejercicio.",
    confidence: 0.79,
    factors: [
      { label: "Tendencia de temperatura", weight: 0.62, detail: "+0.5 °C en 6 h" },
      { label: "Sin ejercicio registrado", weight: 0.23, detail: "descarta calor por esfuerzo" },
      { label: "HR levemente alta", weight: 0.15, detail: "88 lpm en reposo" },
    ],
  },
  a8: {
    summary: "La velocidad del sonido en el radio bajó 1,9 % en 42 días, más del doble de lo esperado, y el ejercicio de carga está por debajo de lo planificado.",
    confidence: 0.72,
    factors: [
      { label: "Baja de la SOS del radio", weight: 0.44, detail: "−1,9 % frente a −0,8 % esperado" },
      { label: "Ejercicio de carga incompleto", weight: 0.31, detail: "46 % de lo planificado" },
      { label: "Días en microgravedad", weight: 0.17, detail: "día 42 de 180" },
      { label: "Fluidos (contorno de muñeca)", weight: 0.08, detail: "+2,3 %, descontado" },
    ],
  },
};

const GENERIC: Explanation = {
  summary: "El valor salió del rango normal durante varias lecturas seguidas.",
  confidence: 0.8,
  factors: [
    { label: "Valor fuera de rango", weight: 0.7, detail: "varias lecturas seguidas" },
    { label: "Tendencia reciente", weight: 0.3, detail: "últimas 2 h" },
  ],
};

/** Explicación de una alerta. Si viene del backend, se muestra el motivo que escribió el modelo. */
export function explainAlert(alert: { id: string; detail?: string; count?: number }): Explanation {
  if (alert.detail) {
    return {
      summary: alert.detail.replace(/^\[[^\]]+\]\s*/, ""),
      confidence: 0,
      factors: [
        { label: "Motivo registrado por el modelo", weight: 1, detail: "texto original del backend" },
        ...(alert.count && alert.count > 1 ? [{ label: "Alerta repetida", weight: Math.min(1, alert.count / 30), detail: `${alert.count} veces` }] : []),
      ],
    };
  }
  return ALERT_EXPLANATIONS[alert.id] ?? GENERIC;
}
