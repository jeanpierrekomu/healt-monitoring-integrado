"use client";

import { Cpu, Pause, Play, ScanEye, Upload } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { MissionClock, Progress } from "@/components/ui/animated";
import { Button, Card, CardTitle, Pill } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { boxAt, VISION_FINDINGS, VISION_TRACKS, VISION_VIDEO } from "@/services/ai";

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export default function VisionPage() {
  const video = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState<"idle" | "scanning" | "done">("idle");
  const [playing, setPlaying] = useState(true);
  const [time, setTime] = useState(0);

  // Escaneo inicial y re-análisis
  useEffect(() => {
    const t = setTimeout(() => setPhase("scanning"), 400);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (phase !== "scanning") return;
    const t = setTimeout(() => setPhase("done"), 2200);
    return () => clearTimeout(t);
  }, [phase]);

  // Sincroniza las detecciones con el fotograma actual del video
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      if (video.current) setTime(video.current.currentTime);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const toggle = () => {
    const v = video.current;
    if (!v) return;
    if (v.paused) {
      void v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };
  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    if (video.current) video.current.currentTime = ((e.clientX - r.left) / r.width) * VISION_VIDEO.duration;
  };

  const boxes = phase === "done" ? VISION_TRACKS.map((tr) => ({ tr, box: boxAt(tr, time) })) : [];
  const activeIds = new Set(boxes.filter((b) => b.box).map((b) => b.tr.id));

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <Card>
        <CardTitle
          title="Cámara del módulo de hábitat"
          subtitle="CAM-02 · 1080p · 30 fps · Gateway, módulo HALO"
          right={
            <AnimatePresence mode="wait">
              <motion.span key={phase} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
                {phase === "done" ? <Pill tone="normal">Analizando en vivo</Pill> : <Pill tone="primary">{phase === "scanning" ? "Escaneando…" : "Conectando…"}</Pill>}
              </motion.span>
            </AnimatePresence>
          }
        />
        <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
          <video
            ref={video}
            src={VISION_VIDEO.src}
            poster={VISION_VIDEO.poster}
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 size-full object-cover"
            style={{ filter: "contrast(1.05) saturate(0.85)" }}
          />
          {/* Textura de cámara de seguridad */}
          <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,rgb(0_0_0/0.12)_0px,rgb(0_0_0/0.12)_1px,transparent_1px,transparent_3px)] mix-blend-multiply" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgb(0_0_0/0.55))]" />

          {/* Escaneo */}
          <AnimatePresence>
            {phase === "scanning" && (
              <motion.div
                className="absolute inset-x-0 h-24 bg-gradient-to-b from-transparent via-primary/25 to-primary/60"
                initial={{ top: "-25%" }}
                animate={{ top: "100%" }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.1, repeat: 1, ease: "easeInOut" }}
              >
                <div className="absolute bottom-0 h-0.5 w-full bg-primary shadow-[0_0_16px_#4f8cff]" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Detecciones con seguimiento */}
          <AnimatePresence>
            {boxes.map(({ tr, box }, i) =>
              box ? (
                <motion.div
                  key={tr.id}
                  className="absolute rounded-md border-2"
                  style={{ left: `${box.l}%`, top: `${box.y}%`, width: `${box.w}%`, height: `${box.h}%`, borderColor: tr.color, boxShadow: `0 0 18px ${tr.color}66, inset 0 0 18px ${tr.color}22` }}
                  initial={{ opacity: 0, scale: 1.15 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: tr.window ? 0 : i * 0.2, type: "spring", stiffness: 260, damping: 22 }}
                >
                  <span className="absolute -top-6 left-[-2px] rounded px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap text-white" style={{ background: tr.color }}>
                    {tr.label} · {tr.conf} %
                  </span>
                </motion.div>
              ) : null,
            )}
          </AnimatePresence>

          <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded bg-black/40 px-2 py-1 text-xs font-bold text-critico backdrop-blur-sm">
            <motion.span className="size-2 rounded-full bg-critico" animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1.2, repeat: Infinity }} />
            REC · EN VIVO
          </div>
          <div className="absolute top-3 right-3 rounded bg-black/40 px-2 py-1 font-mono text-[11px] text-white/80 backdrop-blur-sm">
            CAM-02 · <MissionClock />
          </div>
        </div>

        {/* Controles */}
        <div className="mt-4 flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={toggle}
            aria-label={playing ? "Pausar" : "Reproducir"}
            className="flex size-9 items-center justify-center rounded-full bg-primary text-white shadow-[0_6px_18px_-6px_#4f8cff]"
          >
            {playing ? <Pause className="size-4" /> : <Play className="ml-0.5 size-4" />}
          </motion.button>
          <span className="font-mono text-xs text-muted tabular-nums">{fmt(time)}</span>
          <div className="relative h-1.5 flex-1 cursor-pointer rounded-full bg-surface-2" onClick={seek}>
            <div className="h-full rounded-full bg-primary" style={{ width: `${(time / VISION_VIDEO.duration) * 100}%` }} />
            {VISION_TRACKS.filter((t) => t.window).map((t) => (
              <span
                key={t.id}
                title={t.label}
                className="absolute top-0 h-1.5 rounded"
                style={{ left: `${(t.window![0] / VISION_VIDEO.duration) * 100}%`, width: `${((t.window![1] - t.window![0]) / VISION_VIDEO.duration) * 100}%`, background: `${t.color}aa` }}
              />
            ))}
          </div>
          <span className="font-mono text-xs text-muted">{fmt(VISION_VIDEO.duration)}</span>
          <Pill>1x</Pill>
        </div>
      </Card>

      <div className="flex flex-col gap-6">
        <Card>
          <CardTitle title="Hallazgos" right={<span className="text-xs text-muted">{phase === "done" ? `${VISION_FINDINGS.length} detecciones` : "—"}</span>} />
          <div className="flex flex-col">
            {VISION_FINDINGS.map((f, i) => {
              const live = activeIds.has(f.id);
              return (
                <div key={f.label} className={cn("-mx-2 flex flex-col gap-1.5 rounded-lg border-t border-border px-2 py-3 transition-colors duration-300", live && phase === "done" && "bg-surface-2")}>
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="flex items-center gap-2 font-semibold">
                      {f.label}
                      {live && phase === "done" && (
                        <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="rounded bg-critico/15 px-1.5 py-0.5 text-[10px] font-bold text-critico">
                          AHORA
                        </motion.span>
                      )}
                    </span>
                    {phase === "done" ? <span className={`font-bold ${f.text}`}>{f.conf} %</span> : <span className="skeleton h-4 w-10 rounded" />}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="min-w-0 flex-1 text-[11px] text-muted">{f.sub}</span>
                    <Progress value={phase === "done" ? f.conf : 0} className="w-24" barClassName={f.bar} delay={0.1 * i} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
        <Card className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Cpu className="size-[18px] text-primary" />
            <p className="text-[15px] font-semibold">Cómo funciona el modelo</p>
          </div>
          <p className="text-[13px] leading-relaxed text-muted">
            Un detector de objetos y pose sigue a cada persona y equipo cuadro a cuadro. Un segundo modelo reconoce gestos (secarse la frente, llevarse la mano al pecho) y signos de fatiga en el rostro. Cada hallazgo guarda su confianza y el fragmento de video que sirve de evidencia.
          </p>
          <div className="flex flex-wrap gap-2">
            <Pill tone="primary">Modelo v0.3</Pill>
            <Pill>Video de demostración</Pill>
          </div>
          <div className="mt-1 grid grid-cols-2 gap-2.5">
            <Button variant="secondary"><Upload className="size-4" /> Subir video</Button>
            <Button onClick={() => setPhase("scanning")} disabled={phase === "scanning"}>
              <ScanEye className="size-4" /> {phase === "scanning" ? "Analizando…" : "Re-analizar"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
