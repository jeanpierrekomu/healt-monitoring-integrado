"use client";

import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { AnimatedNumber, Segmented } from "@/components/ui/animated";
import { Card, CardTitle, StatusBadge } from "@/components/ui/primitives";
import { InfoButton } from "@/components/didactic/vital-info";
import { useLiveValue } from "@/hooks/use-live-series";
import { cn, STATUS_META } from "@/lib/utils";
import { normalFor, statusFor, vitalContext } from "@/services/education";
import type { Astronaut } from "@/lib/types";
import { useVitalWatch } from "@/components/alerts/alert-popup-context";
import { Ecg } from "./ecg";

const HeartScene = dynamic(() => import("@/components/three/heart-scene"), {
  ssr: false,
  loading: () => <div className="skeleton size-full rounded-full opacity-40" />,
});

// Escenarios de demostración (solo frontend): llevan la HR a un valor objetivo de forma gradual.
const SCENARIOS = {
  real: { label: "Datos reales", bpm: null },
  reposo: { label: "Reposo profundo", bpm: 52 },
  ejercicio: { label: "Ejercicio", bpm: 128 },
  taquicardia: { label: "Taquicardia", bpm: 152 },
  paro: { label: "Paro cardíaco", bpm: 0 },
} as const;
type Scenario = keyof typeof SCENARIOS;

const TREND = {
  up: { label: "Acelerándose", icon: TrendingUp, className: "bg-advertencia/15 text-advertencia" },
  down: { label: "Desacelerándose", icon: TrendingDown, className: "bg-primary/15 text-primary" },
  flat: { label: "Estable", icon: Minus, className: "bg-surface-2 text-muted" },
} as const;

/** Corazón 3D + ECG que laten a la frecuencia real del astronauta. */
export function HeartMonitor({ astronaut, baseHr }: { astronaut: Astronaut; baseHr: number }) {
  const name = astronaut.name;
  const ctx = vitalContext(astronaut, "hr");
  const [scenario, setScenario] = useState<Scenario>("real");
  const simulated = SCENARIOS[scenario].bpm;
  const target = simulated ?? baseHr;
  // En simulación la HR avanza más rápido hacia el objetivo para que el cambio se vea en segundos.
  const raw = useLiveValue(target, simulated === 0 ? 0 : simulated ? 0.8 : 1.6, simulated !== null ? 400 : 1500);
  // Sin pulso: la HR cae a 0 y el ECG queda plano.
  const bpm = Math.max(0, raw);
  // Si el pulso empeora (taquicardia, sin pulso), salta la alerta emergente con voz.
  useVitalWatch(astronaut, "hr", bpm);
  // Fase compartida: el ECG marca el ritmo y el corazón 3D late al unísono.
  const pulse = useRef({ phase: 0 });
  const status = statusFor("hr", bpm, ctx);
  const color = STATUS_META[status].hex;
  const seconds = bpm > 1 ? 60 / bpm : null;
  const gap = target - bpm;
  const trend = gap > 4 ? TREND.up : gap < -4 ? TREND.down : TREND.flat;
  const TrendIcon = trend.icon;

  return (
    <Card className="flex h-full flex-col">
      <CardTitle
        title="Corazón en vivo"
        subtitle={`${name} · late a su frecuencia real`}
        right={<InfoButton vital="hr" value={bpm} align="right" ctx={ctx} />}
      />
      <div className="flex items-center gap-5">
        <div className="relative size-56 shrink-0">
          <div
            className="absolute inset-4 rounded-full blur-2xl transition-colors duration-700"
            style={{ background: `${color}${bpm > 100 ? "55" : "33"}` }}
          />
          <HeartScene bpm={bpm} color={color} pulse={pulse} />
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-[42px] leading-none font-bold tracking-tight">
            <AnimatedNumber value={bpm} duration={0.6} />
            <span className="ml-1.5 text-base font-medium text-muted">lpm</span>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={status} className="w-fit" />
            <AnimatePresence mode="wait">
              <motion.span
                key={trend.label}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", trend.className)}
              >
                <TrendIcon className="size-3.5" /> {trend.label}
              </motion.span>
            </AnimatePresence>
          </div>
          <p className="text-xs leading-relaxed text-muted">
            {seconds ? (
              <>
                Un latido cada <span className="font-semibold text-fg">{seconds.toFixed(2)} s</span>
              </>
            ) : (
              <span className="font-semibold text-critico">Sin pulso detectado</span>
            )}
            <br />
            {simulated ? (
              <>
                Objetivo de la simulación: <span className="font-semibold text-fg">{simulated} lpm</span>
              </>
            ) : (
              `Normal en reposo: ${normalFor("hr", ctx)} · su normal: ${astronaut.baseline.hr} lpm`
            )}
          </p>
        </div>
      </div>
      <div className="mt-4">
        <Ecg bpm={bpm} color={color} pulse={pulse} />
      </div>
      <div className="mt-4 flex flex-col gap-2">
        <p className="text-[11px] font-semibold tracking-wider text-muted">SIMULAR CAMBIO DE PULSO</p>
        <Segmented
          id="hr-scenario"
          value={scenario}
          onChange={setScenario}
          options={(Object.keys(SCENARIOS) as Scenario[]).map((k) => ({ value: k, label: SCENARIOS[k].label }))}
        />
        <p className="text-[11px] leading-relaxed text-muted">
          Al subir el pulso, el corazón late más rápido y más fuerte y el ECG se comprime; al bajar, late lento y suave. Demo solo de frontend.
        </p>
      </div>
    </Card>
  );
}
