"use client";

import { Plus, Rocket } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { PageHeader, Progress } from "@/components/ui/animated";
import { Stagger, StaggerItem } from "@/components/ui/motion";
import { Avatar, Button, Card, Pill, type PillTone } from "@/components/ui/primitives";
import type { Mission, MissionStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS: Record<MissionStatus, { label: string; tone: PillTone }> = {
  "en-curso": { label: "En curso", tone: "primary" },
  planificada: { label: "Planificada", tone: "atencion" },
  completada: { label: "Completada", tone: "normal" },
};

const ICON_TONE: Record<MissionStatus, string> = {
  "en-curso": "bg-primary/15 text-primary",
  planificada: "bg-atencion/15 text-atencion",
  completada: "bg-normal/15 text-normal",
};

export function MissionsView({ missions }: { missions: Mission[] }) {
  const [selected, setSelected] = useState(missions[0].id);
  const m = missions.find((x) => x.id === selected)!;

  return (
    <>
      <PageHeader
        title="Misiones"
        subtitle="1 en curso · 1 planificada · 2 completadas"
        actions={<Button><Plus className="size-4" /> Nueva misión</Button>}
      />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,560px)_1fr]">
        <Stagger className="flex flex-col gap-4">
          {missions.map((mi) => {
            const st = STATUS[mi.status];
            const active = mi.id === selected;
            return (
              <StaggerItem key={mi.id}>
                <motion.button
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setSelected(mi.id)}
                  className={cn("card glow-hover flex w-full flex-col gap-3 p-5 text-left", active && "border-primary/70 shadow-[0_0_0_1px_rgb(79_140_255/0.35)]")}
                >
                  <div className="flex items-center gap-3">
                    <span className={cn("flex size-10 items-center justify-center rounded-xl", ICON_TONE[mi.status])}>
                      <Rocket className="size-[18px]" />
                    </span>
                    <div className="flex-1">
                      <p className="text-[15px] font-semibold">{mi.name}</p>
                      <p className="text-xs text-muted">{mi.destination}</p>
                    </div>
                    <Pill tone={st.tone}>{st.label}</Pill>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted">{mi.dates}</span>
                    <span className="font-semibold">{mi.progressLabel}</span>
                  </div>
                  {mi.status !== "planificada" && (
                    <Progress value={mi.progress} barClassName={mi.status === "en-curso" ? "bg-primary" : "bg-normal"} />
                  )}
                  <div className="flex -space-x-2">
                    {mi.crew.map((c) => (
                      <Avatar key={c} initials={c} size={28} />
                    ))}
                  </div>
                </motion.button>
              </StaggerItem>
            );
          })}
        </Stagger>

        <AnimatePresence mode="wait">
          <motion.div
            key={m.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col gap-5"
          >
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {m.stats.map((s, i) => (
                <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}>
                  <Card className="p-4">
                    <p className="text-[22px] font-bold">{s.value}</p>
                    <p className="text-xs font-medium text-muted">{s.label}</p>
                  </Card>
                </motion.div>
              ))}
            </div>
            <Card>
              <div className="mb-5 flex items-start justify-between">
                <div>
                  <p className="text-[15px] font-semibold">{m.name} · cronograma</p>
                  <p className="text-xs text-muted">Fases de la misión y eventos de salud relevantes</p>
                </div>
                <Pill tone={STATUS[m.status].tone}>{STATUS[m.status].label}</Pill>
              </div>
              <ol>
                {m.phases.map((p, i) => (
                  <motion.li
                    key={p.name}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 + i * 0.08 }}
                    className="relative flex gap-4 pb-6 last:pb-0"
                  >
                    {i < m.phases.length - 1 && (
                      <motion.span
                        className="absolute top-4 left-[6px] w-0.5 bg-border"
                        initial={{ height: 0 }}
                        animate={{ height: "calc(100% - 8px)" }}
                        transition={{ delay: 0.2 + i * 0.08, duration: 0.4 }}
                      />
                    )}
                    <span className="relative mt-1 flex size-3.5 shrink-0">
                      {p.state === "now" && <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />}
                      <span
                        className={cn(
                          "relative inline-flex size-3.5 rounded-full",
                          p.state === "done" ? "bg-normal" : p.state === "now" ? "bg-primary" : "bg-surface-2 ring-1 ring-border",
                        )}
                      />
                    </span>
                    <div>
                      <p className={cn("text-sm", p.state === "now" ? "font-semibold" : "font-medium", p.state === "next" && "text-muted")}>{p.name}</p>
                      <p className="text-xs text-muted">{p.date}</p>
                    </div>
                  </motion.li>
                ))}
              </ol>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );
}
