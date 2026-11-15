"use client";

import { Droplet, Heart, Moon, Thermometer } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { AnimatedNumber } from "@/components/ui/animated";
import { Avatar, StatusBadge } from "@/components/ui/primitives";
import { useLiveValue } from "@/hooks/use-live-series";
import type { Astronaut } from "@/lib/types";
import { PHASE_META, useSleep } from "@/components/sleep/sleep-context";

function Vital({ icon: Icon, label, base, amp, decimals, unit, interval }: {
  icon: typeof Heart; label: string; base: number; amp: number; decimals: number; unit: string; interval: number;
}) {
  const v = useLiveValue(base, amp, interval);
  return (
    <div className="flex-1 rounded-xl bg-surface-2/80 p-2.5">
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted">
        <Icon className="size-3.5" /> {label}
      </div>
      <div className="mt-1 text-[15px] font-semibold">
        <AnimatedNumber value={v} decimals={decimals} duration={0.6} />
        <span className="ml-1 text-xs font-medium text-muted">{unit}</span>
      </div>
    </div>
  );
}

export function AstronautCard({ astronaut: a }: { astronaut: Astronaut }) {
  const { phase, vitals } = useSleep(a);
  return (
    <motion.div whileHover={{ y: -4 }} transition={{ type: "spring", stiffness: 380, damping: 26 }} className="h-full">
      <Link href={`/astronauts/${a.id}`} className="card glow-hover flex h-full flex-col gap-4 p-5">
        <div className="flex items-center gap-3">
          <Avatar initials={a.initials} size={44} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold">{a.name}</p>
            <p className="truncate text-xs text-muted">
              {a.role} · {a.agency}
            </p>
          </div>
          {phase ? (
            <span className="flex items-center gap-1 rounded-full bg-[#8b7bff]/15 px-2 py-1 text-[11px] font-semibold" style={{ color: PHASE_META[phase].color }}>
              <Moon className="size-3" /> Durmiendo
            </span>
          ) : (
            <StatusBadge status={a.status} />
          )}
        </div>
        <div className="flex gap-2">
          <Vital icon={Heart} label="HR" base={vitals.hr} amp={1.6} decimals={0} unit="lpm" interval={1800} />
          <Vital icon={Droplet} label="SpO₂" base={vitals.spo2} amp={0.3} decimals={0} unit="%" interval={2600} />
          <Vital icon={Thermometer} label="Temp" base={vitals.temp} amp={0.03} decimals={1} unit="°C" interval={3400} />
        </div>
      </Link>
    </motion.div>
  );
}
