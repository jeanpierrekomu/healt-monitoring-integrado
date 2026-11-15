"use client";

import { ChevronDown } from "lucide-react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "motion/react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { LiveAreaChart } from "@/components/charts/live-charts";
import { AnimatedNumber, PageHeader, Progress, Segmented } from "@/components/ui/animated";
import { Card, LiveBadge, StatusBadge } from "@/components/ui/primitives";
import type { Astronaut, VitalConfig, VitalKey } from "@/lib/types";
import { STATUS_META } from "@/lib/utils";
import { vitalProfile } from "@/services/readings";
import { statusFor, vitalContext } from "@/services/education";
import { InfoButton } from "@/components/didactic/vital-info";
import { BodyExplorer } from "@/components/vitals/body-explorer";
import { HeartMonitor } from "@/components/vitals/heart-monitor";
import { BoneHealthCard } from "@/components/vitals/bone-health";
import { useVitalWatch } from "@/components/alerts/alert-popup-context";
import { useSleep } from "@/components/sleep/sleep-context";
import { SleepBanner, SleepToggle } from "@/components/sleep/sleep-ui";
import { boneHealthFor } from "@/services/bone";

const VitalIcon3D = dynamic(() => import("@/components/three/vital-icons"), {
  ssr: false,
  loading: () => <div className="skeleton size-full rounded-xl" />,
});
const QUALITY: Record<VitalKey, number> = { hr: 96, hrv: 91, spo2: 94, temp: 99 };
const THRESHOLD: Partial<Record<VitalKey, number>> = { hr: 110, spo2: 92, temp: 37.8 };

function Select<T extends string>({ label, value, onChange, options }: {
  label: string; value: T; onChange: (v: T) => void; options: { value: T; label: string }[];
}) {
  return (
    <label className="relative flex items-center gap-1.5 rounded-xl border border-border bg-surface py-2.5 pr-9 pl-3.5 text-[13px] transition-colors focus-within:border-primary/60">
      <span className="text-muted">{label}:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="cursor-pointer appearance-none bg-transparent font-semibold outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-surface">
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 size-4 text-muted" />
    </label>
  );
}

/** Vigila el valor en vivo de la tarjeta y lanza la alerta emergente si empeora. */
function Watch({ astronaut, k, value }: { astronaut: Astronaut; k: VitalKey; value: number }) {
  useVitalWatch(astronaut, k, value);
  return null;
}

function VitalCard({ astronaut, config, index }: { astronaut: Astronaut; config: VitalConfig; index: number }) {
  const { base, amp } = vitalProfile(astronaut, config.key);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.06 * index, type: "spring", stiffness: 260, damping: 26 }}
    >
      <Card className="glow-hover">
        <LiveAreaChart
          line={{ key: config.key, label: config.short, color: "#4F8CFF", base, amp, seed: astronaut.id + config.key }}
          min={config.min}
          max={config.max}
          unit={config.unit}
          decimals={config.decimals}
          threshold={THRESHOLD[config.key]}
          height={140}
        >
          {(latest) => {
            const st = statusFor(config.key, latest, vitalContext(astronaut, config.key));
            return (
              <div className="mb-1 flex flex-col gap-3">
                <Watch astronaut={astronaut} k={config.key} value={latest} />
                <div className="flex items-center gap-2.5">
                  <div
                    className="relative size-14 shrink-0 rounded-xl bg-surface-2/80 transition-shadow duration-500"
                    style={{ boxShadow: `inset 0 0 0 1px ${STATUS_META[st].hex}55, 0 0 22px -8px ${STATUS_META[st].hex}` }}
                  >
                    <VitalIcon3D kind={config.key} value={latest} color={STATUS_META[st].hex} />
                  </div>
                  <p className="text-sm font-semibold">{config.label}</p>
                  <span className="flex-1"><InfoButton vital={config.key} value={latest} ctx={vitalContext(astronaut, config.key)} /></span>
                  <AnimatePresence mode="wait">
                    <motion.span key={st} initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }}>
                      <StatusBadge status={st} />
                    </motion.span>
                  </AnimatePresence>
                </div>
                <div className="flex items-end gap-4">
                  <p className="text-[30px] leading-none font-bold">
                    <AnimatedNumber value={latest} decimals={config.decimals} duration={0.5} />
                    <span className="ml-1.5 text-sm font-medium text-muted">{config.unit}</span>
                  </p>
                  <div className="ml-auto flex items-center gap-2 text-[11px] whitespace-nowrap text-muted">
                    Calidad
                    <Progress value={QUALITY[config.key]} className="w-16" barClassName="bg-normal" delay={0.3} />
                    <span className="font-semibold text-fg">{QUALITY[config.key]} %</span>
                  </div>
                </div>
              </div>
            );
          }}
        </LiveAreaChart>
        <p className="mt-2 text-[11px] text-muted">Fuente: {config.source}</p>
      </Card>
    </motion.div>
  );
}

export function MonitoringView({ astronauts, configs }: { astronauts: Astronaut[]; configs: VitalConfig[] }) {
  const requested = useSearchParams().get("astronaut");
  // Por defecto, quien tenga el estado más delicado; si todos están bien, el primero.
  const [id, setId] = useState(
    astronauts.find((a) => a.id === requested)?.id ?? (astronauts.find((a) => a.status !== "normal") ?? astronauts[0]).id,
  );
  const [range, setRange] = useState("live");
  const [source, setSource] = useState<"Wearable" | "Bio-sensor" | "Manual">("Wearable");
  const astronaut = astronauts.find((a) => a.id === id)!;
  // Si la pulsera detecta que duerme, todos los paneles usan los signos vitales del sueño.
  const sleep = useSleep(astronaut);
  const live = { ...astronaut, vitals: sleep.vitals };

  return (
    <>
      <PageHeader
        title="Monitorización"
        subtitle={`${astronaut.name} · ${astronaut.role} · ${astronaut.agency} — signos vitales en tiempo real`}
        actions={
          <div className="flex items-center gap-3">
            <SleepToggle astronaut={astronaut} />
            <LiveBadge label="Transmitiendo" />
          </div>
        }
      />
      <div className="flex flex-wrap items-center gap-3">
        <Select label="Astronauta" value={id} onChange={setId} options={astronauts.map((a) => ({ value: a.id, label: a.name }))} />
        <Select
          label="Rango"
          value={range}
          onChange={setRange}
          options={[
            { value: "live", label: "En vivo" },
            { value: "24h", label: "Últimas 24 h" },
            { value: "7d", label: "Últimos 7 días" },
          ]}
        />
        <div className="ml-auto flex items-center gap-3">
          <span className="text-[13px] font-medium text-muted">Fuente:</span>
          <Segmented
            id="source"
            value={source}
            onChange={setSource}
            options={[
              { value: "Wearable", label: "Wearable" },
              { value: "Bio-sensor", label: "Bio-sensor" },
              { value: "Manual", label: "Manual" },
            ]}
          />
        </div>
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col gap-6"
        >
          <SleepBanner astronaut={astronaut} />
          <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <BodyExplorer astronaut={live} />
            <HeartMonitor astronaut={astronaut} baseHr={live.vitals.hr} />
          </div>
          {(() => {
            const bone = boneHealthFor(astronaut.id);
            return bone ? <BoneHealthCard bone={bone} name={astronaut.name} /> : null;
          })()}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {configs.map((c, i) => (
            <VitalCard key={id + c.key} astronaut={live} config={c} index={i} />
          ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
}
