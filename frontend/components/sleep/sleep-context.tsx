"use client";

// Modo sueño (solo frontend): simula que la pulsera detecta que el astronauta duerme
// y ajusta sus signos vitales según la fase del sueño. Cuando exista la API, el estado
// "durmiendo" vendrá del backend; la interfaz no cambia.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Astronaut, Vitals } from "@/lib/types";

export type SleepPhase = "ligero" | "profundo" | "rem";

export const PHASE_META: Record<SleepPhase, { label: string; detail: string; color: string }> = {
  ligero: { label: "Sueño ligero", detail: "El pulso y la respiración empiezan a bajar.", color: "#4f8cff" },
  profundo: { label: "Sueño profundo", detail: "Pulso más bajo y mayor HRV: el cuerpo se recupera.", color: "#8b7bff" },
  rem: { label: "Sueño REM", detail: "Etapa de los sueños: el pulso sube y se vuelve irregular.", color: "#c56bff" },
};

// Cambios típicos frente a estar despierto en reposo (valores de ejemplo para la demo).
const DELTA: Record<SleepPhase, { hr: number; hrv: number; spo2: number; temp: number }> = {
  ligero: { hr: -0.12, hrv: 0.2, spo2: -0.5, temp: -0.2 },
  profundo: { hr: -0.2, hrv: 0.4, spo2: -1, temp: -0.4 },
  rem: { hr: -0.08, hrv: 0.05, spo2: -0.8, temp: -0.3 },
};

/** Ciclo acelerado para la demo: 90 s ≈ un ciclo de sueño real de ~90 min. */
function phaseAt(seconds: number): SleepPhase {
  const t = seconds % 90;
  if (t < 25) return "ligero";
  if (t < 55) return "profundo";
  if (t < 75) return "rem";
  return "ligero";
}

interface SleepContextValue {
  isSleeping: (id: string) => boolean;
  phaseOf: (id: string) => SleepPhase | null;
  minutesOf: (id: string) => number;
  toggle: (id: string) => void;
  adjust: (a: Astronaut) => Vitals;
}

const SleepContext = createContext<SleepContextValue | null>(null);

export function SleepProvider({ children }: { children: React.ReactNode }) {
  const [since, setSince] = useState<Record<string, number>>({});
  const [now, setNow] = useState(0);
  const anySleeping = Object.keys(since).length > 0;

  useEffect(() => {
    if (!anySleeping) return;
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [anySleeping]);

  const toggle = useCallback((id: string) => {
    setSince((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = Date.now();
      return next;
    });
  }, []);

  const value = useMemo<SleepContextValue>(() => {
    const elapsed = (id: string) => (since[id] && now ? Math.max(0, (now - since[id]) / 1000) : 0);
    const phaseOf = (id: string) => (since[id] ? phaseAt(elapsed(id)) : null);
    return {
      isSleeping: (id) => !!since[id],
      phaseOf,
      // En la demo, cada segundo real equivale a un minuto de sueño.
      minutesOf: (id) => Math.floor(elapsed(id)),
      toggle,
      adjust: (a) => {
        const p = phaseOf(a.id);
        if (!p) return a.vitals;
        const d = DELTA[p];
        return {
          hr: a.vitals.hr * (1 + d.hr),
          hrv: a.vitals.hrv * (1 + d.hrv),
          spo2: a.vitals.spo2 + d.spo2,
          temp: a.vitals.temp + d.temp,
        };
      },
    };
  }, [since, now, toggle]);

  return <SleepContext.Provider value={value}>{children}</SleepContext.Provider>;
}

export function useSleepContext() {
  const ctx = useContext(SleepContext);
  if (!ctx) throw new Error("useSleepContext debe usarse dentro de <SleepProvider>");
  return ctx;
}

/** Signos vitales del astronauta ajustados si está durmiendo, más el estado del sueño. */
export function useSleep(a: Astronaut) {
  const ctx = useSleepContext();
  return {
    sleeping: ctx.isSleeping(a.id),
    phase: ctx.phaseOf(a.id),
    minutes: ctx.minutesOf(a.id),
    vitals: ctx.adjust(a),
    toggle: () => ctx.toggle(a.id),
  };
}
