"use client";

import { useEffect, useRef } from "react";

const g = (p: number, c: number, w: number) => Math.exp(-(((p - c) / w) ** 2));

/** Forma de un latido (onda P, complejo QRS y onda T) en función de la fase 0–1. */
function ecgShape(p: number) {
  return 0.12 * g(p, 0.12, 0.025) - 0.12 * g(p, 0.235, 0.008) + 1 * g(p, 0.25, 0.011) - 0.25 * g(p, 0.272, 0.01) + 0.3 * g(p, 0.47, 0.04);
}

/** Electrocardiograma que se dibuja en vivo como un monitor de hospital (barrido). */
export function Ecg({
  bpm,
  color,
  height = 110,
  pulse,
}: {
  bpm: number;
  color: string;
  height?: number;
  /** Si se pasa, el ECG publica aquí su fase del latido para que otros elementos laten al unísono. */
  pulse?: React.RefObject<{ phase: number }>;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const bpmRef = useRef(bpm);
  const colorRef = useRef(color);
  const pulseRef = useRef(pulse);
  useEffect(() => {
    bpmRef.current = bpm;
    colorRef.current = color;
    pulseRef.current = pulse;
  }, [bpm, color, pulse]);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const ctx = el.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    let w = 0;
    const h = height;
    const resize = () => {
      w = el.clientWidth;
      el.width = w * dpr;
      el.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    const SPEED = 130; // px por segundo
    let x = 0;
    let phase = 0;
    let prevY = h / 2;
    let last = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const steps = Math.max(1, Math.round(dt * SPEED));
      ctx.lineWidth = 2;
      ctx.lineJoin = "round";
      ctx.strokeStyle = colorRef.current;
      ctx.shadowColor = colorRef.current;
      ctx.shadowBlur = 8;
      for (let i = 0; i < steps; i++) {
        phase = (phase + bpmRef.current / 60 / SPEED) % 1;
        if (pulseRef.current?.current) pulseRef.current.current.phase = phase;
        const y = h * 0.58 - ecgShape(phase) * h * 0.42 + (Math.random() - 0.5) * 1.2;
        ctx.clearRect(x + 1, 0, 16, h);
        ctx.beginPath();
        ctx.moveTo(x, prevY);
        ctx.lineTo(x + 1, y);
        ctx.stroke();
        prevY = y;
        x += 1;
        if (x >= w) {
          x = 0;
          ctx.clearRect(0, 0, 16, h);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [height]);

  return (
    <canvas
      ref={canvas}
      className="w-full rounded-xl border border-border"
      style={{
        height,
        backgroundColor: "#081019",
        backgroundImage:
          "linear-gradient(rgb(79 140 255 / 0.07) 1px, transparent 1px), linear-gradient(90deg, rgb(79 140 255 / 0.07) 1px, transparent 1px)",
        backgroundSize: "18px 18px",
      }}
      aria-label="Electrocardiograma en vivo"
    />
  );
}
