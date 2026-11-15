"use client";

import { Activity, Plus, Users } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { PageHeader, Segmented } from "@/components/ui/animated";
import { Button, ButtonLink, Pill, type PillTone } from "@/components/ui/primitives";
import type { Difficulty, Scenario } from "@/lib/types";
import { ScenarioIcon } from "./scenario-icon";

const DIFF: Record<Difficulty, PillTone> = { Alta: "critico", Media: "advertencia", Baja: "normal" };
const ICON_BG: Record<Difficulty, string> = {
  Alta: "bg-critico/15 text-critico",
  Media: "bg-advertencia/15 text-advertencia",
  Baja: "bg-normal/15 text-normal",
};
type Cat = "todos" | Scenario["category"];

export function SimulationsView({ scenarios }: { scenarios: Scenario[] }) {
  const [cat, setCat] = useState<Cat>("todos");
  const shown = cat === "todos" ? scenarios : scenarios.filter((s) => s.category === cat);
  return (
    <>
      <PageHeader
        title="Simulaciones"
        subtitle="Escenarios para evaluar la detección de la IA y la respuesta médica"
        actions={<Button><Plus className="size-4" /> Crear escenario</Button>}
      />
      <Segmented
        id="sim-cat"
        value={cat}
        onChange={setCat}
        options={[
          { value: "todos", label: `Todos (${scenarios.length})` },
          { value: "Cardiovascular", label: "Cardiovascular" },
          { value: "Respiratorio", label: "Respiratorio" },
          { value: "Ambiental", label: "Ambiental" },
          { value: "Conductual", label: "Conductual" },
        ]}
      />
      <motion.div layout className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {shown.map((s, i) => (
            <motion.div
              key={s.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1, transition: { delay: i * 0.05, type: "spring", stiffness: 280, damping: 26 } }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
              whileHover={{ y: -4 }}
              className="card glow-hover flex flex-col gap-3.5 p-5"
            >
              <div className="flex items-center justify-between">
                <motion.span whileHover={{ rotate: -8, scale: 1.08 }} className={`flex size-10 items-center justify-center rounded-xl ${ICON_BG[s.difficulty]}`}>
                  <ScenarioIcon icon={s.icon} className="size-5" />
                </motion.span>
                <Pill tone={DIFF[s.difficulty]}>Dificultad {s.difficulty}</Pill>
              </div>
              <p className="text-base font-semibold">{s.name}</p>
              <p className="text-[13px] leading-relaxed text-muted">{s.description}</p>
              <div className="flex gap-4 text-xs text-muted">
                <span className="flex items-center gap-1.5"><Activity className="size-3.5" /> Duración {s.duration}</span>
                <span className="flex items-center gap-1.5"><Users className="size-3.5" /> {s.crewCount} {s.crewCount === 1 ? "astronauta" : "astronautas"}</span>
              </div>
              <div className="mt-auto flex items-center gap-3 border-t border-border pt-3.5">
                <span className="flex-1 text-[11px] text-muted">{s.lastRun}</span>
                <ButtonLink href={`/simulations/${s.id}`} className="px-3.5 py-2">Ejecutar</ButtonLink>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </>
  );
}
