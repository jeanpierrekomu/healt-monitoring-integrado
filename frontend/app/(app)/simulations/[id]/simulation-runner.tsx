"use client";

import { Check, ChevronLeft, Download, RotateCcw } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { AnimatedNumber, PageHeader } from "@/components/ui/animated";
import { Avatar, Button, Card, CardTitle, Pill } from "@/components/ui/primitives";
import type { Scenario } from "@/lib/types";
import { cn } from "@/lib/utils";
import { simulationSignal, SIM_COMPARISON, SIM_STEPS } from "@/services/simulations-data";

export function SimulationRunner({ scenario }: { scenario: Scenario }) {
  const [progress, setProgress] = useState(0);
  const [approved, setApproved] = useState(false);
  const [run, setRun] = useState(0);
  const signal = useMemo(() => simulationSignal(scenario.id), [scenario.id]);

  useEffect(() => {
    const id = setInterval(() => setProgress((p) => (p >= 80 ? p : p + 1)), 65);
    return () => clearInterval(id);
  }, [run]);

  useEffect(() => {
    if (!approved) return;
    const id = setInterval(() => setProgress((p) => (p >= 100 ? 100 : p + 1)), 30);
    return () => clearInterval(id);
  }, [approved]);

  const stepIndex = SIM_STEPS.findIndex((s) => progress < s.until);
  const current = stepIndex === -1 ? SIM_STEPS.length : stepIndex;
  const visible = Math.max(2, Math.round((Math.min(progress, 65) / 65) * signal.length));
  const data = signal.slice(0, visible);
  const detected = progress >= 65;
  const done = progress >= 100;
  const waiting = progress >= 80 && !approved;

  return (
    <>
      <Link href="/simulations" className="group -mb-3 flex w-fit items-center gap-1 text-xs font-semibold text-muted hover:text-fg">
        <ChevronLeft className="size-4 transition-transform group-hover:-translate-x-0.5" /> Simulaciones
      </Link>
      <PageHeader title={scenario.name} subtitle={`Ejecución #${24 + run} · ${scenario.crewCount} ${scenario.crewCount === 1 ? "astronauta" : "astronautas"} · modelo de detección v0.3`} />

      <Card>
        <div className="flex flex-wrap items-center gap-2">
          {SIM_STEPS.map((s, i) => {
            const st = i < current ? "done" : i === current ? "now" : "next";
            return (
              <div key={s.name} className="flex flex-1 items-center gap-2" style={{ minWidth: 150 }}>
                <motion.span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                    st === "done" ? "bg-normal text-white" : st === "now" ? "bg-primary text-white" : "bg-surface-2 text-muted",
                  )}
                  animate={st === "now" ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                  transition={{ duration: 1.2, repeat: st === "now" ? Infinity : 0 }}
                >
                  {st === "done" ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
                </motion.span>
                <span className={cn("text-[13px] whitespace-nowrap", st === "now" ? "font-semibold" : "font-medium", st === "next" && "text-muted")}>{s.name}</span>
                {i < SIM_STEPS.length - 1 && (
                  <span className="relative mx-1 h-0.5 flex-1 overflow-hidden rounded bg-border">
                    <motion.span className="absolute inset-y-0 left-0 bg-normal" animate={{ width: st === "done" ? "100%" : "0%" }} transition={{ duration: 0.5 }} />
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex items-center gap-4">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
            <motion.div className={cn("h-full rounded-full", done ? "bg-normal" : "bg-primary")} animate={{ width: `${progress}%` }} transition={{ ease: "linear", duration: 0.1 }} />
          </div>
          <span className="w-44 text-right text-xs font-semibold text-muted tabular-nums">
            {progress} % · {done ? "informe listo" : waiting ? "esperando revisión" : SIM_STEPS[current]?.name.toLowerCase()}
          </span>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <Card>
          <CardTitle title="Señal simulada y momento de detección" subtitle="HR del astronauta durante el escenario (lpm)" />
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data} margin={{ top: 24, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#1F2A40" vertical={false} strokeDasharray="3 6" />
              <XAxis dataKey="min" type="number" domain={[0, 60]} ticks={[0, 15, 30, 45, 60]} tickFormatter={(v) => `${v} min`} tick={{ fill: "#8A97AD", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis domain={[60, 160]} orientation="right" width={34} tick={{ fill: "#8A97AD", fontSize: 10 }} axisLine={false} tickLine={false} />
              {detected && <ReferenceLine x={48} stroke="#4F8CFF" strokeWidth={2} label={{ value: "Alerta IA · min 48", fill: "#4F8CFF", fontSize: 11, position: "top" }} />}
              {progress >= 80 && <ReferenceLine x={52} stroke="#22C55E" strokeWidth={2} label={{ value: "Doctor · min 52", fill: "#22C55E", fontSize: 11, position: "insideTopRight" }} />}
              <Line dataKey="hr" type="monotone" stroke="#EF4444" strokeWidth={2.4} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <CardTitle title="IA vs. doctor" right={<Pill tone={detected ? "normal" : "muted"}>{detected ? "Precisión 94 %" : "Calculando…"}</Pill>} />
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-[11px] tracking-wider text-muted">
                <th className="py-2 text-left font-semibold">MÉTRICA</th>
                <th className="py-2 text-left font-semibold">MODELO IA</th>
                <th className="py-2 text-left font-semibold">DOCTOR</th>
              </tr>
            </thead>
            <tbody>
              {SIM_COMPARISON.map((r, i) => (
                <tr key={r.metric} className="border-t border-border">
                  <td className="py-2.5 text-muted">{r.metric}</td>
                  {[r.ia, r.doctor].map((v, j) => (
                    <td key={j} className="py-2.5 font-semibold">
                      <AnimatePresence mode="wait">
                        {(j === 0 ? detected : progress >= 80) ? (
                          <motion.span key="v" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                            {typeof v === "number" ? <AnimatedNumber value={v} decimals={r.decimals ?? 0} suffix={r.suffix ?? ""} /> : v}
                          </motion.span>
                        ) : (
                          <motion.span key="s" exit={{ opacity: 0 }} className="skeleton inline-block h-3.5 w-14 rounded" />
                        )}
                      </AnimatePresence>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <motion.div animate={{ opacity: progress >= 80 ? 1 : 0.4 }} transition={{ duration: 0.4 }}>
        <Card className="relative overflow-hidden">
          <AnimatePresence>
            {done && (
              <motion.div
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_50%,rgb(34_197_94/0.18),transparent_55%)]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              />
            )}
          </AnimatePresence>
          <div className="relative flex flex-wrap items-center gap-3">
            <Avatar initials="DR" size={38} />
            <div className="flex-1">
              <p className="text-[15px] font-semibold">Revisión del doctor</p>
              <p className="text-xs text-muted">Dra. Rivera · Médico de vuelo</p>
            </div>
            <AnimatePresence mode="wait">
              <motion.span key={done ? "ok" : "p"} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                {done ? <Pill tone="normal">✓ Aprobado</Pill> : <Pill tone="atencion">{waiting ? "Pendiente de aprobación" : "En espera"}</Pill>}
              </motion.span>
            </AnimatePresence>
          </div>
          <textarea
            defaultValue="La IA detectó la taquicardia 3 minutos antes que yo. La acción sugerida es correcta. Revisar el falso positivo del minuto 12 (artefacto por movimiento)."
            className="relative mt-4 h-20 w-full resize-none rounded-xl border border-border bg-surface-2 px-4 py-3 text-[13px] leading-relaxed outline-none focus:border-primary/60"
          />
          <div className="relative mt-4 flex justify-end gap-2.5">
            <Button variant="secondary" onClick={() => {
                setProgress(0);
                setApproved(false);
                setRun((r) => r + 1);
              }}>
              <RotateCcw className="size-4" /> Repetir simulación
            </Button>
            {done ? (
              <Button>
                <Download className="size-4" /> Descargar informe
              </Button>
            ) : (
              <Button onClick={() => setApproved(true)} disabled={!waiting}>
                <Check className="size-4" /> Aprobar resultado
              </Button>
            )}
          </div>
        </Card>
      </motion.div>
    </>
  );
}
