"use client";

import { Cpu, Pause, Play } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { AnimatedNumber, Progress } from "@/components/ui/animated";
import { Card, CardTitle, Pill } from "@/components/ui/primitives";
import { cn, seeded } from "@/lib/utils";

import { AUDIO_DURATION as DURATION, AUDIO_FINDINGS as FINDINGS, AUDIO_LINES as LINES, AUDIO_SPEAKERS as SPEAKERS, type Speaker } from "@/services/ai";

const BARS = 120;

function speakerAt(sec: number): Speaker | null {
  return LINES.find((l) => sec >= l.t && sec <= l.end)?.who ?? null;
}
const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export default function AudioPage() {
  const [playing, setPlaying] = useState(true);
  const [time, setTime] = useState(0);

  const bars = useMemo(() => {
    const r = seeded(7);
    return Array.from({ length: BARS }, (_, i) => {
      const sec = (i / BARS) * DURATION;
      const who = speakerAt(sec);
      return { who, h: who ? 18 + r() * 82 : 4 + r() * 6 };
    });
  }, []);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setTime((t) => (t + 0.4 >= DURATION ? 0 : t + 0.4)), 100);
    return () => clearInterval(id);
  }, [playing]);

  const current = LINES.findLast((l) => time >= l.t);
  const progress = time / DURATION;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardTitle
          title="Comunicación tierra–tripulación"
          subtitle="Canal de voz · 14:28 UTC · 01:20 de duración"
          right={
            <div className="flex flex-wrap items-center gap-3">
              {Object.values(SPEAKERS).map((s) => (
                <span key={s.name} className="flex items-center gap-1.5 text-xs text-muted">
                  <span className="size-2 rounded-full" style={{ background: s.color }} />
                  {s.name}
                </span>
              ))}
              <Pill tone="normal">Analizado</Pill>
            </div>
          }
        />
        <div className="relative flex h-24 cursor-pointer items-center gap-[3px]" onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setTime(((e.clientX - r.left) / r.width) * DURATION);
        }}>
          {bars.map((b, i) => {
            const played = i / BARS <= progress;
            const near = Math.abs(i / BARS - progress) < 0.025 && playing && b.who;
            return (
              <motion.span
                key={i}
                className="flex-1 rounded-full"
                style={{ background: b.who ? SPEAKERS[b.who].color : "#8A97AD", opacity: played ? 1 : 0.3 }}
                animate={{ height: `${near ? Math.min(100, b.h * 1.25) : b.h}%` }}
                transition={{ type: "spring", stiffness: 300, damping: 18 }}
              />
            );
          })}
          <motion.span className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow-[0_0_10px_white]" style={{ left: `${progress * 100}%` }} />
        </div>
        <div className="mt-4 flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setPlaying((p) => !p)}
            className="flex size-9 items-center justify-center rounded-full bg-primary text-white shadow-[0_6px_18px_-6px_#4f8cff]"
          >
            {playing ? <Pause className="size-4" /> : <Play className="ml-0.5 size-4" />}
          </motion.button>
          <span className="font-mono text-xs text-muted tabular-nums">
            {fmt(time)} / {fmt(DURATION)}
          </span>
          <span className="ml-auto flex gap-2">
            <Pill>Velocidad 1x</Pill>
            <Pill>Español</Pill>
          </span>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <Card>
          <CardTitle title="Transcripción con hablantes" right={<span className="text-xs text-muted">Whisper + diarización</span>} />
          <div className="flex flex-col gap-1">
            {LINES.map((l) => {
              const sp = SPEAKERS[l.who];
              const active = current === l;
              const heard = time >= l.t;
              return (
                <div key={l.t} className="relative flex gap-4 rounded-xl px-3 py-2.5">
                  {active && (
                    <motion.span layoutId="line-active" className={cn("absolute inset-0 rounded-xl", l.evidence ? "bg-critico/12 ring-1 ring-critico/30" : "bg-primary/10 ring-1 ring-primary/25")} transition={{ type: "spring", stiffness: 380, damping: 32 }} />
                  )}
                  <span className="relative w-10 pt-0.5 font-mono text-xs text-muted">{fmt(l.t)}</span>
                  <div className={cn("relative flex-1 transition-opacity duration-300", heard ? "opacity-100" : "opacity-40")}>
                    <p className={cn("text-xs font-semibold", sp.text)}>{sp.name}</p>
                    <p className="mt-0.5 text-[13px]">{l.text}</p>
                  </div>
                  {l.evidence && heard && <Pill tone="critico" className="relative self-start">Evidencia</Pill>}
                </div>
              );
            })}
          </div>
        </Card>
        <Card>
          <CardTitle title="Hallazgos del modelo" subtitle="Aparecen a medida que el audio avanza" />
          <div className="flex flex-col">
            {FINDINGS.map((f) => {
              const found = time >= f.at;
              return (
                <div key={f.label} className="flex flex-col gap-2 border-t border-border py-3">
                  <div className="flex justify-between text-[13px]">
                    <span className={cn("font-semibold transition-opacity", found ? "opacity-100" : "opacity-40")}>{f.label}</span>
                    <AnimatePresence mode="wait">
                      {found ? (
                        <motion.span key="v" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
                          <AnimatedNumber value={f.conf} suffix=" %" className={`font-bold ${f.text}`} />
                        </motion.span>
                      ) : (
                        <motion.span key="s" exit={{ opacity: 0 }} className="skeleton h-4 w-10 rounded" />
                      )}
                    </AnimatePresence>
                  </div>
                  <Progress value={found ? f.conf : 0} barClassName={f.bar} />
                  <span className="text-[11px] text-muted">{f.ev}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-2 border-t border-border pt-3 text-xs text-muted">
            <Cpu className="size-4 text-primary" /> Clasificador acústico v0.2 · datos ficticios
          </div>
        </Card>
      </div>
    </div>
  );
}
