"use client";

import { ChevronDown, Droplet, Heart, ShieldCheck, Sparkles, Thermometer } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { Fragment, useState } from "react";
import { PageHeader, Segmented } from "@/components/ui/animated";
import { Stagger, StaggerItem } from "@/components/ui/motion";
import { Avatar, Pill, StatusBadge } from "@/components/ui/primitives";
import { StatCard } from "@/components/ui/stat-card";
import type { Astronaut, HealthAlert, ReviewState } from "@/lib/types";
import { updateAlertReview } from "@/services/alert-actions";
import { explainAlert, type Explanation } from "@/services/explain";
import { cn } from "@/lib/utils";

/** Explicación de la IA: qué señales pesaron más en la alerta. */
function WhyPanel({ ex }: { ex: Explanation }) {
  return (
    <div className="mx-5 mb-4 grid grid-cols-1 gap-5 rounded-xl border border-primary/30 bg-primary/5 p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <div className="flex flex-col gap-2">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-primary">
          <Sparkles className="size-3.5" /> POR QUÉ LA IA EMITIÓ ESTA ALERTA
        </p>
        <p className="text-[13px] leading-relaxed">{ex.summary}</p>
        <p className="text-xs text-muted">
          {ex.confidence > 0 && (
            <>
              Confianza del modelo: <span className="font-semibold text-fg">{Math.round(ex.confidence * 100)} %</span> ·{" "}
            </>
          )}
          El médico siempre confirma la decisión.
        </p>
      </div>
      <div className="flex flex-col gap-2.5">
        <p className="text-[11px] font-semibold tracking-wider text-muted">SEÑALES QUE MÁS PESARON</p>
        {ex.factors.map((f, i) => (
          <div key={f.label} className="flex flex-col gap-1">
            <div className="flex justify-between text-xs">
              <span className="font-semibold">{f.label}</span>
              <span className="text-muted">{f.detail} · <span className="font-semibold text-primary">{Math.round(f.weight * 100)} %</span></span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-2">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary to-[#8ab4ff]"
                initial={{ width: 0 }}
                animate={{ width: `${f.weight * 100}%` }}
                transition={{ delay: 0.1 + i * 0.08, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const REVIEW: Record<ReviewState, { label: string; tone: "critico" | "atencion" | "normal"; next?: ReviewState; action?: string }> = {
  pendiente: { label: "Pendiente", tone: "critico", next: "en-revision", action: "Revisar" },
  "en-revision": { label: "En revisión", tone: "atencion", next: "resuelta", action: "Resolver" },
  resuelta: { label: "Resuelta", tone: "normal" },
};

type Filter = "todas" | ReviewState;

export function AlertsView({ initialAlerts, astronauts }: { initialAlerts: HealthAlert[]; astronauts: Astronaut[] }) {
  const [alerts, setAlerts] = useState(initialAlerts);
  const [filter, setFilter] = useState<Filter>("todas");
  const [expanded, setExpanded] = useState<string | null>("a1");
  const astro = (id: string) => astronauts.find((a) => a.id === id)!;
  const open = alerts.filter((a) => a.review !== "resuelta");
  const by = (s: HealthAlert["severity"]) => open.filter((a) => a.severity === s).length;
  const shown = filter === "todas" ? alerts : alerts.filter((a) => a.review === filter);

  const advance = (al: HealthAlert) => {
    const next = REVIEW[al.review].next;
    if (!next) return;
    setAlerts((prev) => prev.map((x) => (x.id === al.id ? { ...x, review: next } : x)));
    void updateAlertReview(al.id, next);
  };

  return (
    <>
      <PageHeader title="Alertas" subtitle={`${open.length} abiertas · ${alerts.length - open.length} resueltas · revisión del médico de vuelo`} />
      <Stagger className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StaggerItem><StatCard icon={Heart} title="Críticas abiertas" value={by("critico")} tone="text-critico" /></StaggerItem>
        <StaggerItem><StatCard icon={Droplet} title="Advertencias" value={by("advertencia")} tone="text-advertencia" /></StaggerItem>
        <StaggerItem><StatCard icon={Thermometer} title="Atención" value={by("atencion")} tone="text-atencion" /></StaggerItem>
        <StaggerItem><StatCard icon={ShieldCheck} title="Resueltas" value={alerts.length - open.length} tone="text-normal" /></StaggerItem>
      </Stagger>
      <Segmented
        id="alert-filter"
        value={filter}
        onChange={setFilter}
        options={[
          { value: "todas", label: "Todas" },
          { value: "pendiente", label: "Pendientes" },
          { value: "en-revision", label: "En revisión" },
          { value: "resuelta", label: "Resueltas" },
        ]}
      />
      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[1100px] text-left text-[13px]">
          <thead>
            <tr className="bg-surface-2/70 text-[11px] font-semibold tracking-wider text-muted">
              {["SEVERIDAD", "ASTRONAUTA", "VARIABLE", "VALOR", "FUENTE", "HORA", "REVISIÓN MÉDICA", ""].map((h) => (
                <th key={h} className="px-5 py-3 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
              {shown.map((al, i) => {
                const a = astro(al.astronautId);
                const r = REVIEW[al.review];
                const ex = explainAlert(al);
                const isOpen = expanded === al.id;
                return (
                  <Fragment key={al.id}>
                  <motion.tr
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0, transition: { delay: i * 0.03 } }}
                    className="border-t border-border transition-colors hover:bg-surface-2/50"
                  >
                    <td className="px-5 py-3.5"><StatusBadge status={al.severity} /></td>
                    <td className="px-5 py-3.5">
                      <Link href={`/astronauts/${a.id}`} className="flex items-center gap-2.5 font-semibold hover:text-primary">
                        <Avatar initials={a.initials} size={28} /> {a.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5">{al.variable}</td>
                    <td className="px-5 py-3.5 font-semibold tabular-nums">{al.value}</td>
                    <td className="px-5 py-3.5 text-muted">{al.source}</td>
                    <td className="px-5 py-3.5 text-muted">{al.time}</td>
                    <td className="px-5 py-3.5">
                      <AnimatePresence mode="wait">
                        <motion.span key={al.review} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="inline-block">
                          <Pill tone={r.tone}>{r.label}</Pill>
                        </motion.span>
                      </AnimatePresence>
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <motion.button
                        whileTap={{ scale: 0.94 }}
                        onClick={() => setExpanded(isOpen ? null : al.id)}
                        className={cn(
                          "mr-2 inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors",
                          isOpen ? "bg-primary/15 text-primary" : "text-muted hover:text-fg",
                        )}
                      >
                        <Sparkles className="size-3.5" /> ¿Por qué?
                        <ChevronDown className={cn("size-3.5 transition-transform", isOpen && "rotate-180")} />
                      </motion.button>
                      {r.action && (
                        <motion.button
                          whileTap={{ scale: 0.94 }}
                          onClick={() => advance(al)}
                          className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:border-primary/60 hover:bg-primary/10"
                        >
                          {r.action}
                        </motion.button>
                      )}
                    </td>
                  </motion.tr>
                  <tr>
                    <td colSpan={8} className="p-0">
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                            className="overflow-hidden"
                          >
                            <WhyPanel ex={ex} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </td>
                  </tr>
                  </Fragment>
                );
              })}
          </tbody>
        </table>
        {shown.length === 0 && <p className="px-5 py-10 text-center text-[13px] text-muted">No hay alertas en este estado.</p>}
      </div>
    </>
  );
}
