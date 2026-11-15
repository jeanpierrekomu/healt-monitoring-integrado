// Ficha médica de cada tripulante. VALORES DE EJEMPLO: el backend todavía no guarda sexo, edad,
// valores habituales ni tipo de sangre. Cuando los agregue, este archivo se elimina y se leen de ahí.
import type { Sex, Vitals } from "@/lib/types";

export interface MedicalProfile {
  sex: Sex;
  age: number;
  origin: string;
  bloodType: string;
  previousMissions: string[];
  evaHours: number;
  baseline: Vitals;
}

const PROFILES: Record<string, MedicalProfile> = {
  "alex-vance": { sex: "M", age: 44, origin: "Houston, EE. UU.", bloodType: "O+", previousMissions: ["ISS-66"], evaHours: 31, baseline: { hr: 64, hrv: 55, spo2: 98, temp: 36.6 } },
  "elena-rostova": { sex: "F", age: 41, origin: "Kazán, Rusia", bloodType: "A+", previousMissions: ["ISS-68"], evaHours: 12, baseline: { hr: 70, hrv: 60, spo2: 98, temp: 36.7 } },
  "marcus-chen": { sex: "M", age: 37, origin: "Vancouver, Canadá", bloodType: "B+", previousMissions: [], evaHours: 6, baseline: { hr: 66, hrv: 52, spo2: 98, temp: 36.6 } },
  "sarah-connor": { sex: "F", age: 35, origin: "Los Ángeles, EE. UU.", bloodType: "AB+", previousMissions: [], evaHours: 0, baseline: { hr: 72, hrv: 58, spo2: 99, temp: 36.7 } },
};

const GENERIC: MedicalProfile = { sex: "M", age: 40, origin: "Sin dato", bloodType: "Sin dato", previousMissions: [], evaHours: 0, baseline: { hr: 68, hrv: 55, spo2: 98, temp: 36.6 } };

export function medicalProfile(id: string): MedicalProfile {
  return PROFILES[id] ?? GENERIC;
}
