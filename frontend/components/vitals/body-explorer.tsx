"use client";

import { Droplet, Heart, MousePointerClick, Rotate3d, Thermometer, Waves, type LucideIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import dynamic from "next/dynamic";
import { useState } from "react";
import { VitalExplainer } from "@/components/didactic/vital-info";
import { AnimatedNumber } from "@/components/ui/animated";
import { Card, StatusBadge } from "@/components/ui/primitives";
import { useLiveValue } from "@/hooks/use-live-series";
import type { Astronaut, VitalKey } from "@/lib/types";
import { cn, STATUS_META } from "@/lib/utils";
import { statusFor, VITAL_EDUCATION, vitalContext } from "@/services/education";
import { vitalConfig } from "@/services/readings";
import type { SensorReading } from "@/components/three/hologram-scene";

const HologramScene = dynamic(() => import("@/components/three/hologram-scene"), {
  ssr: false,
  loading: () => (
    <div className="flex size-full items-center justify-center">
      <div className="skeleton h-3/4 w-1/3 rounded-[40%]" />
    </div>
  ),
});

const FATIGUE: Record<Astronaut["status"], number> = { normal: 0, atencion: 0.25, advertencia: 0.5, critico: 0.8 };
const ICON: Record<VitalKey, LucideIcon> = { hr: Heart, hrv: Waves, spo2: Droplet, temp: Thermometer };
const WHERE: Record<VitalKey, string> = {
  hr: "Corazón · parche en el pecho",
  hrv: "Sistema nervioso · parche en el pecho",
  spo2: "Pulmones · oxímetro en el dedo",
  temp: "Núcleo corporal · sensor en la muñeca",
};

/** Astronauta 3D con sensores sobre el cuerpo + panel didáctico del sensor elegido. */
export function BodyExplorer({ astronaut: a }: { astronaut: Astronaut }) {
  const [selected, setSelected] = useState<VitalKey | null>(null);
  const live: Record<VitalKey, number> = {
    hr: useLiveValue(a.vitals.hr, 1.6, 1500),
    hrv: useLiveValue(a.vitals.hrv, 1.2, 2500),
    spo2: useLiveValue(a.vitals.spo2, 0.25, 3000),
    temp: useLiveValue(a.vitals.temp, 0.03, 4000),
  };
  const keys: VitalKey[] = ["hr", "hrv", "spo2", "temp"];
  const sensors: SensorReading[] = keys.map((k) => ({
    key: k,
    label: vitalConfig(k).short,
    value: live[k].toFixed(VITAL_EDUCATION[k].decimals),
    status: statusFor(k, live[k], vitalContext(a, k)),
    bpm: k === "hr" || k === "hrv" ? live.hr : k === "spo2" ? 40 : 24,
  }));

  return (
    <Card className="grid grid-cols-1 gap-0 overflow-hidden p-0 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
      <div className="relative h-[460px] bg-[radial-gradient(circle_at_50%_40%,rgb(79_140_255/0.16),transparent_65%)] lg:h-[560px]">
        <div className="pointer-events-none absolute top-4 left-5 z-10">
          <p className="text-[15px] font-semibold">Holograma médico</p>
          <p className="text-xs text-muted">{a.name} · datos en vivo</p>
        </div>
        <HologramScene sensors={sensors} selected={selected} onSelect={setSelected} fatigue={FATIGUE[a.status]} />
        <div className="pointer-events-none absolute bottom-4 left-5 flex items-center gap-4 text-[11px] text-muted">
          <span className="flex items-center gap-1.5"><Rotate3d className="size-3.5" /> Arrastra para girar</span>
          <span className="flex items-center gap-1.5"><MousePointerClick className="size-3.5" /> Clic en un órgano</span>
        </div>
      </div>

      <div className="flex flex-col gap-4 border-t border-border p-5 lg:border-t-0 lg:border-l">
        <div className="grid grid-cols-2 gap-2">
          {sensors.map((s) => {
            const Icon = ICON[s.key];
            const active = selected === s.key;
            return (
              <motion.button
                key={s.key}
                whileTap={{ scale: 0.96 }}
                onClick={() => setSelected(active ? null : s.key)}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition-colors",
                  active ? "border-primary/70 bg-primary/10" : "border-border hover:border-primary/40",
                )}
              >
                <Icon className="size-4" style={{ color: STATUS_META[s.status].hex }} />
                <span className="flex-1 text-xs font-medium text-muted">{s.label}</span>
                <span className="text-[13px] font-semibold tabular-nums">{s.value}</span>
              </motion.button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {selected ? (
            <motion.div
              key={selected}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col gap-4"
            >
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs text-muted">{WHERE[selected]}</p>
                  <p className="text-sm font-semibold">{VITAL_EDUCATION[selected].name}</p>
                  <p className="mt-1 text-[32px] leading-none font-bold">
                    <AnimatedNumber value={live[selected]} decimals={VITAL_EDUCATION[selected].decimals} duration={0.6} />
                    <span className="ml-1.5 text-sm font-medium text-muted">{VITAL_EDUCATION[selected].unit}</span>
                  </p>
                </div>
                <StatusBadge status={statusFor(selected, live[selected], vitalContext(a, selected))} />
              </div>
              <VitalExplainer vital={selected} value={live[selected]} ctx={vitalContext(a, selected)} />
              <p className="text-[11px] text-muted">Fuente: {vitalConfig(selected).source}</p>
            </motion.div>
          ) : (
            <motion.div
              key="intro"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border p-6 text-center"
            >
              <motion.span
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-primary"
              >
                <MousePointerClick className="size-6" />
              </motion.span>
              <p className="text-sm font-semibold">Toca un órgano o una tarjeta</p>
              <p className="max-w-xs text-xs leading-relaxed text-muted">
                Cada órgano del holograma está conectado a su signo vital: el cerebro a la HRV (estrés y fatiga), los pulmones a la SpO₂, el corazón a la HR y el abdomen a la temperatura central. El color indica el estado. Elige uno para saber qué mide, su rango normal y por qué cambia en el espacio.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
}
