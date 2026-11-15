// Contenido de la documentación (mock). Puede migrar a MDX o a un CMS más adelante.

export const DOC_INDEX = [
  { group: "EMPEZAR", items: ["Introducción", "Guía rápida"] },
  { group: "PLATAFORMA", items: ["Arquitectura", "Fuentes de datos", "Alertas y umbrales", "Roles y permisos"] },
  { group: "INTELIGENCIA ARTIFICIAL", items: ["Modelo de visión", "Modelo de audio", "Evaluación"] },
  { group: "DESARROLLO", items: ["API (FastAPI)", "Supabase", "Glosario"] },
];

export const DOC_SOURCES = [
  { name: "Wearable Bio-Patch", vars: "HR, HRV, temperatura", freq: "1 Hz" },
  { name: "Bio-sensor de dedo", vars: "SpO₂", freq: "0.5 Hz" },
  { name: "Registro manual", vars: "Sueño, síntomas, notas", freq: "Bajo demanda" },
];

export const DOC_SAMPLE = `GET /api/readings?astronaut=diego-vargas&variable=hr
{
  "astronautId": "diego-vargas",
  "variable": "hr",
  "unit": "bpm",
  "source": "wearable",
  "quality": 0.96,
  "points": [{ "t": "2026-11-09T14:32:00Z", "v": 118 }]
}`;
