"use client";

import { Moon, Sun } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import type { Astronaut } from "@/lib/types";
import { PHASE_META, useSleep } from "./sleep-context";

const fmt = (min: number) => `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")} min`;

/** Botón para simular que el astronauta se duerme o se despierta. */
export function SleepToggle({ astronaut, compact = false }: { astronaut: Astronaut; compact?: boolean }) {
  const { sleeping, toggle } = useSleep(astronaut);
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={toggle}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl border font-semibold transition-colors",
        compact ? "px-2.5 py-1.5 text-xs" : "px-3.5 py-2 text-[13px]",
        sleeping ? "border-[#8b7bff]/60 bg-[#8b7bff]/15 text-[#c9c1ff]" : "border-border bg-surface text-muted hover:text-fg",
      )}
    >
      {sleeping ? <Sun className="size-4" /> : <Moon className="size-4" />}
      {sleeping ? "Despertar" : compact ? "Dormir" : "Simular sueño"}
    </motion.button>
  );
}

/** Aviso que aparece cuando la pulsera detecta que el astronauta duerme. */
export function SleepBanner({ astronaut }: { astronaut: Astronaut }) {
  const { sleeping, phase, minutes } = useSleep(astronaut);
  return (
    <AnimatePresence>
      {sleeping && phase && (
        <motion.div
          initial={{ opacity: 0, y: -8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -8, height: 0 }}
          className="overflow-hidden"
        >
          <div className="relative flex flex-wrap items-center gap-4 overflow-hidden rounded-2xl border border-[#8b7bff]/40 bg-gradient-to-r from-[#1b1840] to-[#0e1524] px-5 py-4">
            {/* Estrellas */}
            {[12, 30, 55, 78, 90].map((x, i) => (
              <motion.span
                key={x}
                className="absolute size-1 rounded-full bg-white"
                style={{ left: `${x}%`, top: `${20 + (i % 3) * 25}%` }}
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{ duration: 2 + i * 0.4, repeat: Infinity }}
              />
            ))}
            <motion.span
              className="relative flex size-11 items-center justify-center rounded-full bg-[#8b7bff]/20"
              animate={{ rotate: [-8, 8, -8] }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              <Moon className="size-5 text-[#c9c1ff]" />
            </motion.span>
            <div className="relative min-w-0 flex-1">
              <p className="text-sm font-semibold">
                {astronaut.name} está durmiendo · <span style={{ color: PHASE_META[phase].color }}>{PHASE_META[phase].label}</span>
              </p>
              <p className="text-xs text-muted">
                Detectado por la pulsera: pulso en descenso, sin movimiento y temperatura de la piel más baja. {PHASE_META[phase].detail}
              </p>
            </div>
            <div className="relative text-right">
              <p className="text-lg font-bold tabular-nums">{fmt(minutes)}</p>
              <p className="text-[11px] text-muted">de sueño (demo acelerada)</p>
            </div>
            <div className="relative flex w-full gap-1">
              {(["ligero", "profundo", "rem"] as const).map((p) => (
                <span
                  key={p}
                  className="h-1.5 flex-1 rounded-full transition-opacity"
                  style={{ background: PHASE_META[p].color, opacity: p === phase ? 1 : 0.25 }}
                />
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Panel del dashboard: estado de descanso de cada tripulante, con opción de simular que se duerme. */
export function CrewRest({ astronauts }: { astronauts: Astronaut[] }) {
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
      {astronauts.map((a) => (
        <RestRow key={a.id} astronaut={a} />
      ))}
    </div>
  );
}

function RestRow({ astronaut: a }: { astronaut: Astronaut }) {
  const { sleeping, phase, minutes, vitals } = useSleep(a);
  const meta = phase ? PHASE_META[phase] : null;
  return (
    <motion.div
      layout
      className={cn(
        "flex items-center gap-3 rounded-xl border px-3.5 py-3 transition-colors",
        sleeping ? "border-[#8b7bff]/40 bg-[#8b7bff]/[0.07]" : "border-border bg-surface-2/50",
      )}
    >
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-full"
        style={{ background: meta ? `${meta.color}22` : "rgb(255 200 80 / 0.12)" }}
      >
        {sleeping ? <Moon className="size-4" style={{ color: meta?.color }} /> : <Sun className="size-4 text-[#ffc850]" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold">{a.name}</p>
        <p className="truncate text-[11px] text-muted">
          {meta ? `${meta.label} · ${fmt(minutes)}` : "Despierto"} · {Math.round(vitals.hr)} lpm
        </p>
      </div>
      <SleepToggle astronaut={a} compact />
    </motion.div>
  );
}
