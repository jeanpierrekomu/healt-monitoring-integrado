import { clsx, type ClassValue } from "clsx";
import type { Status } from "./types";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export const STATUS_META: Record<
  Status,
  { label: string; text: string; bg: string; dot: string; hex: string }
> = {
  normal: { label: "Normal", text: "text-normal", bg: "bg-normal/15", dot: "bg-normal", hex: "#22C55E" },
  atencion: { label: "Atención", text: "text-atencion", bg: "bg-atencion/15", dot: "bg-atencion", hex: "#EAB308" },
  advertencia: { label: "Advertencia", text: "text-advertencia", bg: "bg-advertencia/15", dot: "bg-advertencia", hex: "#F97316" },
  critico: { label: "Crítico", text: "text-critico", bg: "bg-critico/15", dot: "bg-critico", hex: "#EF4444" },
};

/** PRNG determinista: mismo resultado en servidor y cliente (evita errores de hidratación). */
export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
