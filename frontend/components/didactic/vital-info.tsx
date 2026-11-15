"use client";

import { Info, Orbit, UserRound, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { VitalKey } from "@/lib/types";
import { cn, STATUS_META } from "@/lib/utils";
import { bandFor, bandsFor, normalFor, personalDeviation, SEX_LABEL, SEX_NOTE, VITAL_EDUCATION, type VitalContext } from "@/services/education";

/** Barra tipo semáforo con las franjas del rango y un marcador en el valor actual. */
export function RangeBar({ vital, value, compact = false, ctx }: { vital: VitalKey; value: number; compact?: boolean; ctx?: VitalContext }) {
  const edu = VITAL_EDUCATION[vital];
  const bands = bandsFor(vital, ctx);
  const [min, max] = edu.domain;
  const pct = (v: number) => ((Math.min(max, Math.max(min, v)) - min) / (max - min)) * 100;
  const segments = bands.map((b, i) => {
    const start = pct(i === 0 ? min : bands[i - 1].to);
    return { ...b, start, width: Math.max(0, pct(b.to) - start) };
  });
  const band = bandFor(vital, value, ctx);
  const pos = pct(value);

  return (
    <div className={cn("w-full", compact ? "pt-5" : "pt-7")}>
      <div className="relative">
        <motion.div
          className="absolute -top-6 flex -translate-x-1/2 flex-col items-center"
          animate={{ left: `${pos}%` }}
          transition={{ type: "spring", stiffness: 160, damping: 20 }}
        >
          <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-bold whitespace-nowrap", STATUS_META[band.status].bg, STATUS_META[band.status].text)}>
            {value.toFixed(edu.decimals)} {edu.unit}
          </span>
        </motion.div>
        <div className="flex h-2.5 overflow-hidden rounded-full">
          {segments.map((s) => (
            <div
              key={s.label}
              title={s.label}
              className="h-full first:rounded-l-full last:rounded-r-full"
              style={{ width: `${s.width}%`, background: STATUS_META[s.status].hex, opacity: s.status === band.status && s.label === band.label ? 1 : 0.35 }}
            />
          ))}
        </div>
        <motion.span
          className="absolute -top-1 h-[18px] w-1 -translate-x-1/2 rounded-full bg-white shadow-[0_0_10px_white]"
          animate={{ left: `${pos}%` }}
          transition={{ type: "spring", stiffness: 160, damping: 20 }}
        />
      </div>
      {!compact && (
        <div className="mt-1.5 flex justify-between text-[10px] text-muted">
          <span>{min} {edu.unit}</span>
          <span className={cn("font-semibold", STATUS_META[band.status].text)}>{band.label}</span>
          <span>{max} {edu.unit}</span>
        </div>
      )}
    </div>
  );
}

/** Contenido didáctico completo de un signo vital. */
export function VitalExplainer({ vital, value, ctx }: { vital: VitalKey; value: number; ctx?: VitalContext }) {
  const edu = VITAL_EDUCATION[vital];
  const personal = personalDeviation(vital, value, ctx?.baseline);
  const sexNote = ctx?.sex ? SEX_NOTE[vital] : null;
  return (
    <div className="flex flex-col gap-3.5 text-[13px] leading-relaxed">
      <div>
        <p className="mb-1 text-[11px] font-semibold tracking-wider text-muted">QUÉ MIDE</p>
        <p>{edu.what}</p>
      </div>
      <div>
        <p className="text-[11px] font-semibold tracking-wider text-muted">
          RANGO NORMAL{ctx?.sex ? ` · ${SEX_LABEL[ctx.sex].toUpperCase()}` : ""} · <span className="text-normal">{normalFor(vital, ctx)}</span>
        </p>
        <RangeBar vital={vital} value={value} ctx={ctx} />
      </div>
      {(personal || sexNote) && (
        <div className="flex gap-2.5 rounded-xl bg-surface-2 p-3">
          <UserRound className="mt-0.5 size-4 shrink-0 text-[#c9c1ff]" />
          <div className="flex flex-col gap-1">
            <p className="text-[11px] font-semibold tracking-wider text-[#c9c1ff]">AJUSTADO A ESTA PERSONA</p>
            {personal && ctx?.baseline !== undefined && (
              <p>
                Su normal en reposo: <span className="font-semibold">{ctx.baseline.toFixed(edu.decimals)} {edu.unit}</span> · ahora{" "}
                <span className={cn("font-semibold", STATUS_META[personal.status].text)}>{personal.delta}</span>
              </p>
            )}
            {sexNote && <p className="text-muted">{sexNote}</p>}
            <p className="text-[10px] text-muted">Valores de ejemplo hasta cargar las fuentes de Referencias.</p>
          </div>
        </div>
      )}
      <div className="flex gap-2.5 rounded-xl bg-primary/10 p-3">
        <Orbit className="mt-0.5 size-4 shrink-0 text-primary" />
        <div>
          <p className="mb-0.5 text-[11px] font-semibold tracking-wider text-primary">¿POR QUÉ CAMBIA EN EL ESPACIO?</p>
          <p className="text-muted">{edu.space}</p>
        </div>
      </div>
    </div>
  );
}

/** Botón ⓘ que abre la explicación en un panel flotante (en un portal, por encima de todo). */
export function InfoButton({ vital, value, align = "left", ctx }: { vital: VitalKey; value: number; align?: "left" | "right"; ctx?: VitalContext }) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const open = pos !== null;
  const WIDTH = 340;

  const toggle = () => {
    if (open || !btn.current) return setPos(null);
    const r = btn.current.getBoundingClientRect();
    const raw = align === "left" ? r.left : r.right - WIDTH;
    const left = Math.max(16, Math.min(raw, window.innerWidth - WIDTH - 16));
    setPos({ top: r.bottom + 8, left });
  };

  useEffect(() => {
    if (!open) return;
    const close = () => setPos(null);
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!panel.current?.contains(t) && !btn.current?.contains(t)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  return (
    <>
      <motion.button
        ref={btn}
        type="button"
        whileHover={{ scale: 1.12 }}
        whileTap={{ scale: 0.9 }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggle();
        }}
        aria-label={`¿Qué significa ${VITAL_EDUCATION[vital].name}?`}
        aria-expanded={open}
        className={cn("flex size-6 items-center justify-center rounded-full transition-colors", open ? "bg-primary text-white" : "text-muted hover:bg-primary/15 hover:text-primary")}
      >
        <Info className="size-4" />
      </motion.button>
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {pos && (
              <motion.div
                ref={panel}
                role="dialog"
                initial={{ opacity: 0, y: -6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.96 }}
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
                className="fixed z-[100] max-h-[70vh] overflow-y-auto rounded-2xl border border-border bg-surface p-4 text-left shadow-2xl shadow-black/60"
                style={{ top: pos.top, left: pos.left, width: WIDTH, transformOrigin: align === "left" ? "top left" : "top right" }}
              >
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-bold">{VITAL_EDUCATION[vital].name}</p>
                  <button type="button" onClick={() => setPos(null)} className="rounded-md p-1 text-muted hover:text-fg">
                    <X className="size-4" />
                  </button>
                </div>
                <VitalExplainer vital={vital} value={value} ctx={ctx} />
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
