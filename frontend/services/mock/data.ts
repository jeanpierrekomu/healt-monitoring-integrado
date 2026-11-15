// Datos ficticios centralizados. Ningún componente debe tener datos de prueba propios:
// todo pasa por los servicios de /services, que leen de aquí mientras no exista la API real.
import type {
  Astronaut,
  HealthAlert,
  Mission,
  PlatformUser,
  Scenario,
  VitalConfig,
} from "@/lib/types";

export const astronauts: Astronaut[] = [
  {
    id: "lucia-mendez", initials: "LM", name: "Lucía Méndez", role: "Comandante", agency: "ESA",
    origin: "Valencia, España", age: 46, previousMissions: ["ISS-64", "Gateway-1"], evaHours: 42,
    bloodType: "A+", profileSource: "Biografía pública ESA", status: "normal",
    sex: "F",
    baseline: { hr: 70, hrv: 60, spo2: 98, temp: 36.6 },
    vitals: { hr: 72, hrv: 58, spo2: 98, temp: 36.6 }, missionId: "artemis-h",
    notes: "Sin incidencias. Mantiene buena calidad de sueño y adherencia al plan de ejercicio.",
  },
  {
    id: "kenji-takahashi", initials: "KT", name: "Kenji Takahashi", role: "Ingeniero de vuelo", agency: "JAXA",
    origin: "Sapporo, Japón", age: 39, previousMissions: ["ISS-70"], evaHours: 18,
    bloodType: "O-", profileSource: "Biografía pública JAXA", status: "atencion",
    sex: "M",
    baseline: { hr: 64, hrv: 52, spo2: 98, temp: 36.6 },
    vitals: { hr: 88, hrv: 41, spo2: 96, temp: 37.1 }, missionId: "artemis-h",
    notes: "Temperatura ligeramente elevada desde ayer. Se pidió registro manual de síntomas.",
  },
  {
    id: "diego-vargas", initials: "DV", name: "Diego Vargas", role: "Piloto", agency: "CONAE",
    origin: "Córdoba, Argentina", age: 41, previousMissions: ["ISS-68", "Gateway-1"], evaHours: 31,
    bloodType: "O+", profileSource: "Biografía pública CONAE", status: "critico",
    sex: "M",
    baseline: { hr: 64, hrv: 50, spo2: 98, temp: 36.6 },
    vitals: { hr: 118, hrv: 28, spo2: 91, temp: 37.9 }, missionId: "artemis-h",
    notes: "Taquicardia tras la sesión de ejercicio. Se indicó reposo de 20 min y nueva medición de SpO₂. Vigilar hidratación y calidad del sueño.",
  },
  {
    id: "amara-okafor", initials: "AO", name: "Amara Okafor", role: "Especialista médica", agency: "NASA",
    origin: "Houston, EE. UU.", age: 37, previousMissions: ["Lunar-HAB-1"], evaHours: 12,
    bloodType: "B+", profileSource: "Biografía pública NASA", status: "normal",
    sex: "F",
    baseline: { hr: 68, hrv: 62, spo2: 99, temp: 36.7 },
    vitals: { hr: 66, hrv: 63, spo2: 99, temp: 36.5 }, missionId: "artemis-h",
    notes: "Responsable médica a bordo. Signos estables.",
  },
  {
    id: "sofia-nilsson", initials: "SN", name: "Sofia Nilsson", role: "Científica", agency: "ESA",
    origin: "Gotemburgo, Suecia", age: 35, previousMissions: ["ISS-Bio-7"], evaHours: 6,
    bloodType: "AB+", profileSource: "Biografía pública ESA", status: "advertencia",
    sex: "F",
    baseline: { hr: 74, hrv: 48, spo2: 98, temp: 36.8 },
    vitals: { hr: 95, hrv: 35, spo2: 94, temp: 37.4 }, missionId: "artemis-h",
    notes: "SpO₂ por debajo de 95 % en dos mediciones. Revisar el sensor de dedo y repetir.",
  },
  {
    id: "raj-patel", initials: "RP", name: "Raj Patel", role: "Especialista de misión", agency: "ISRO",
    origin: "Bangalore, India", age: 43, previousMissions: ["Gaganyaan-2"], evaHours: 9,
    bloodType: "A-", profileSource: "Biografía pública ISRO", status: "normal",
    sex: "M",
    baseline: { hr: 66, hrv: 54, spo2: 98, temp: 36.6 },
    vitals: { hr: 70, hrv: 55, spo2: 98, temp: 36.7 }, missionId: "artemis-h",
    notes: "Sin incidencias.",
  },
];

export const alerts: HealthAlert[] = [
  { id: "a1", severity: "critico", astronautId: "diego-vargas", title: "HR elevado", variable: "Frecuencia cardiaca", value: "118 lpm", source: "Wearable", time: "14:32", ago: "hace 4 min", review: "pendiente" },
  { id: "a2", severity: "advertencia", astronautId: "sofia-nilsson", title: "SpO₂ bajo", variable: "SpO₂", value: "94 %", source: "Bio-sensor", time: "14:10", ago: "hace 22 min", review: "pendiente" },
  { id: "a3", severity: "atencion", astronautId: "kenji-takahashi", title: "Temperatura en aumento", variable: "Temperatura", value: "37.1 °C", source: "Wearable", time: "13:25", ago: "hace 1 h", review: "en-revision" },
  { id: "a8", severity: "advertencia", astronautId: "diego-vargas", title: "Pérdida ósea acelerada", variable: "Salud ósea (SOS radio)", value: "−1.9 %", source: "Wearable", time: "07:00", ago: "hace 7 h", review: "pendiente" },
  { id: "a4", severity: "atencion", astronautId: "amara-okafor", title: "HRV baja", variable: "HRV", value: "38 ms", source: "Wearable", time: "11:02", ago: "hace 3 h", review: "resuelta" },
  { id: "a5", severity: "advertencia", astronautId: "diego-vargas", title: "HR elevado", variable: "Frecuencia cardiaca", value: "104 lpm", source: "Wearable", time: "09:47", ago: "hace 5 h", review: "resuelta" },
  { id: "a6", severity: "atencion", astronautId: "lucia-mendez", title: "SpO₂ en el límite", variable: "SpO₂", value: "95 %", source: "Manual", time: "08:15", ago: "hace 6 h", review: "resuelta" },
  { id: "a7", severity: "atencion", astronautId: "raj-patel", title: "Temperatura alta", variable: "Temperatura", value: "37.3 °C", source: "Bio-sensor", time: "Ayer 22:40", ago: "ayer", review: "resuelta" },
];

export const missions: Mission[] = [
  {
    id: "artemis-h", name: "Artemis-H", status: "en-curso", destination: "Órbita lunar · Estación Gateway",
    dates: "29 sep 2026 – 28 mar 2027", progressLabel: "Día 42 de 180", progress: 23,
    crew: ["LM", "KT", "DV", "AO", "SN", "RP"],
    stats: [{ label: "Tripulantes", value: "6" }, { label: "Alertas", value: "3" }, { label: "Lecturas", value: "1.2 M" }, { label: "Cumplimiento", value: "98 %" }],
    phases: [
      { name: "Lanzamiento", date: "29 sep 2026", state: "done" },
      { name: "Inserción en órbita lunar", date: "3 oct 2026", state: "done" },
      { name: "Operaciones científicas", date: "Día 6 – 150 · en curso", state: "now" },
      { name: "EVA programada (Vargas, Méndez)", date: "Día 60", state: "next" },
      { name: "Regreso a la Tierra", date: "Día 180 · 28 mar 2027", state: "next" },
    ],
  },
  {
    id: "gateway-3", name: "Gateway-3", status: "planificada", destination: "Estación Gateway",
    dates: "Inicio: may 2027 · 120 días", progressLabel: "Tripulación en entrenamiento", progress: 0,
    crew: ["AO", "RP", "KT"],
    stats: [{ label: "Tripulantes", value: "3" }, { label: "Duración", value: "120 d" }, { label: "Entrenamiento", value: "64 %" }, { label: "Riesgo", value: "Bajo" }],
    phases: [
      { name: "Selección de tripulación", date: "ene 2026", state: "done" },
      { name: "Entrenamiento", date: "feb 2026 – abr 2027", state: "now" },
      { name: "Lanzamiento", date: "may 2027", state: "next" },
    ],
  },
  {
    id: "lunar-hab-1", name: "Lunar-HAB-1", status: "completada", destination: "Superficie lunar · Polo sur",
    dates: "feb – abr 2025 · 60 días", progressLabel: "Sin incidentes críticos", progress: 100,
    crew: ["LM", "DV"],
    stats: [{ label: "Tripulantes", value: "2" }, { label: "Alertas", value: "4" }, { label: "Lecturas", value: "640 k" }, { label: "Cumplimiento", value: "100 %" }],
    phases: [
      { name: "Alunizaje", date: "feb 2025", state: "done" },
      { name: "Operaciones en superficie", date: "60 días", state: "done" },
      { name: "Regreso", date: "abr 2025", state: "done" },
    ],
  },
  {
    id: "iss-bio-7", name: "ISS-Bio-7", status: "completada", destination: "Órbita baja terrestre",
    dates: "2024 · 90 días", progressLabel: "2 alertas resueltas", progress: 100,
    crew: ["SN", "DV", "KT"],
    stats: [{ label: "Tripulantes", value: "3" }, { label: "Alertas", value: "2" }, { label: "Lecturas", value: "910 k" }, { label: "Cumplimiento", value: "97 %" }],
    phases: [
      { name: "Lanzamiento", date: "mar 2024", state: "done" },
      { name: "Experimentos biomédicos", date: "90 días", state: "done" },
      { name: "Regreso", date: "jun 2024", state: "done" },
    ],
  },
];

export const scenarios: Scenario[] = [
  { id: "arritmia-eva", name: "Arritmia durante EVA", category: "Cardiovascular", icon: "heart", description: "Taquicardia súbita de 140 lpm durante una caminata espacial de 6 h.", duration: "6 h", crewCount: 2, difficulty: "Alta", lastRun: "Hace 2 días · 94 % de precisión" },
  { id: "hipoxia-cabina", name: "Hipoxia leve en cabina", category: "Respiratorio", icon: "droplet", description: "Caída gradual de SpO₂ por un fallo parcial del soporte vital.", duration: "3 h", crewCount: 6, difficulty: "Media", lastRun: "Hace 5 días · 89 % de precisión" },
  { id: "despresurizacion", name: "Despresurización lenta", category: "Ambiental", icon: "activity", description: "Fuga en el módulo de hábitat que afecta a toda la tripulación.", duration: "45 min", crewCount: 6, difficulty: "Alta", lastRun: "Nunca ejecutado" },
  { id: "fatiga", name: "Fatiga acumulada", category: "Conductual", icon: "waves", description: "Cinco días con poco sueño: baja la HRV y aumentan los errores.", duration: "5 días", crewCount: 1, difficulty: "Media", lastRun: "Hace 1 semana · 91 % de precisión" },
  { id: "fiebre", name: "Fiebre de origen desconocido", category: "Cardiovascular", icon: "thermometer", description: "Temperatura en aumento sin síntomas respiratorios asociados.", duration: "48 h", crewCount: 1, difficulty: "Baja", lastRun: "Hace 3 semanas · 97 % de precisión" },
  { id: "tormenta-solar", name: "Tormenta solar", category: "Ambiental", icon: "shield", description: "Exposición a radiación; refugio y monitorización intensiva.", duration: "12 h", crewCount: 6, difficulty: "Alta", lastRun: "Hace 1 mes · 86 % de precisión" },
];

export const users: PlatformUser[] = [
  { id: "u1", initials: "AR", name: "Dra. Ana Rivera", email: "ana.rivera@healt.space", role: "Médico", state: "Activo", lastAccess: "Hace 5 min" },
  { id: "u2", initials: "TI", name: "Dr. Tomás Ibarra", email: "tomas.ibarra@healt.space", role: "Médico", state: "Activo", lastAccess: "Hace 2 h" },
  { id: "u3", initials: "MS", name: "Marco Silva", email: "marco.silva@healt.space", role: "Investigador", state: "Activo", lastAccess: "Ayer" },
  { id: "u4", initials: "ER", name: "Elena Ruiz", email: "elena.ruiz@healt.space", role: "Administrador", state: "Activo", lastAccess: "Hace 20 min" },
  { id: "u5", initials: "CN", name: "Carla Núñez", email: "carla.nunez@healt.space", role: "Observador", state: "Invitación pendiente", lastAccess: "—" },
  { id: "u6", initials: "LP", name: "Luis Prado", email: "luis.prado@healt.space", role: "Investigador", state: "Inactivo", lastAccess: "Hace 3 semanas" },
];

export const vitalConfigs: VitalConfig[] = [
  { key: "hr", label: "Frecuencia cardiaca (HR)", short: "HR", unit: "lpm", min: 50, max: 140, decimals: 0, source: "Wearable Bio-Patch v2 · 1 Hz" },
  { key: "hrv", label: "Variabilidad cardiaca (HRV)", short: "HRV", unit: "ms", min: 10, max: 80, decimals: 0, source: "Wearable Bio-Patch v2 · ventana 5 min" },
  { key: "spo2", label: "Saturación de oxígeno (SpO₂)", short: "SpO₂", unit: "%", min: 85, max: 100, decimals: 0, source: "Bio-sensor de dedo · 0.5 Hz" },
  { key: "temp", label: "Temperatura corporal", short: "Temp", unit: "°C", min: 35.5, max: 38.5, decimals: 1, source: "Wearable Bio-Patch v2 · 1/min" },
];
