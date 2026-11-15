"use client";

// Alertas emergentes con diseño de alarma médica y espacial:
// - IEC 60601-1-8 (alarmas de monitores médicos): prioridad alta en rojo con parpadeo rápido (~2 Hz),
//   media en naranja con parpadeo lento, baja fija.
// - Sistema de Precaución y Advertencia de la ISS: la alerta máxima es una "alarma maestra" central que
//   hay que ATENDER (no se cierra sola); las demás se apilan a la derecha.
import { Activity, AudioLines, Bone, Check, Cpu, Droplet, HeartCrack, HeartPulse, ListChecks, Siren, Thermometer, TriangleAlert, Users, Volume2, VolumeX, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn, STATUS_META } from "@/lib/utils";
import { LEVEL, type AlertTopic } from "@/services/alert-messages";
import { alarmPing } from "@/services/tts";
import { useAlertPopup, type ShownAlert } from "./alert-popup-context";

const ICON: Record<AlertTopic, typeof Activity> = {
  hr: HeartPulse,
  hrv: Activity,
  spo2: Droplet,
  temp: Thermometer,
  bone: Bone,
  arrest: HeartCrack,
  model: Cpu,
};
const SUBLEVEL: Record<string, string> = { critico: "Emergencia médica", advertencia: "Advertencia", atencion: "Precaución" };
const VISIBLE = 3;
const AUTO_CLOSE_MS = 12_000;

const initials = (name: string) =>
  name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("");

/** Línea de señal en vivo: plana si no hay pulso, picos rápidos en taquicardia, onda suave en el resto. */
function SignalLine({ topic, color, calm }: { topic: AlertTopic; color: string; calm: boolean }) {
  const beat = "M0 20 L14 20 L18 16 L22 20 L28 20 L31 4 L35 34 L39 20 L50 20 L56 14 L62 20 L80 20";
  const wave = "M0 20 Q10 8 20 20 T40 20 T60 20 T80 20";
  const d = topic === "arrest" ? "M0 20 L80 20" : topic === "hr" ? beat : wave;
  return (
    <div className="relative h-10 w-full overflow-hidden rounded-lg bg-black/30">
      <motion.svg
        viewBox="0 0 160 40"
        preserveAspectRatio="none"
        className="absolute inset-y-0 left-0 h-full w-[200%]"
        animate={calm ? undefined : { x: ["0%", "-50%"] }}
        transition={{ duration: topic === "hr" ? 0.9 : 2.4, repeat: Infinity, ease: "linear" }}
      >
        {[0, 80].map((x) => (
          <path key={x} d={d} transform={`translate(${x} 0)`} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
        ))}
      </motion.svg>
      {topic === "arrest" && (
        <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold tracking-[0.3em] text-critico">SIN PULSO</span>
      )}
    </div>
  );
}

function Who({ a, big, color }: { a: ShownAlert; big: boolean; color: string }) {
  const names = a.group?.names ?? [a.name];
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex shrink-0 -space-x-3">
        {names.slice(0, 3).map((n) => (
          <span
            key={n}
            className={cn("flex items-center justify-center rounded-full border-2 bg-surface-2 font-bold", big ? "size-16 text-xl" : "size-12 text-base")}
            style={{ borderColor: color, boxShadow: `0 0 18px -4px ${color}` }}
          >
            {initials(n)}
          </span>
        ))}
      </div>
      <div className="min-w-0">
        <p className="flex items-center gap-1 text-[10px] font-semibold tracking-[0.2em] text-muted uppercase">
          {a.group ? <Users className="size-3" /> : null}
          {a.group ? `${names.length} astronautas` : "Astronauta"}
        </p>
        <p className={cn("leading-tight font-extrabold break-words", big ? "text-2xl sm:text-[28px]" : "text-xl")}>
          {a.group ? names.map((n) => n.split(" ")[0]).join(" · ") : a.name}
        </p>
      </div>
    </div>
  );
}

function Steps({ a, color, open }: { a: ShownAlert; color: string; open: boolean }) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.ol
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="grid list-none gap-1.5 overflow-hidden sm:grid-cols-2"
        >
          {a.steps.map((s, i) => (
            <li key={s} className="flex gap-2 rounded-lg bg-surface-2/70 p-2 text-[12.5px] leading-snug">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold" style={{ background: `${color}33`, color }}>
                {i + 1}
              </span>
              {s}
            </li>
          ))}
          <li className="text-[10px] text-muted sm:col-span-2">Pasos orientativos: el médico de vuelo siempre confirma la decisión.</li>
        </motion.ol>
      )}
    </AnimatePresence>
  );
}

function PopupCard({ a, big = false }: { a: ShownAlert; big?: boolean }) {
  const { voiceOn, mute, dismiss } = useAlertPopup();
  const onClose = useCallback(() => dismiss(a.id), [dismiss, a.id]);
  const calm = useReducedMotion() ?? false;
  const meta = STATUS_META[a.severity];
  const critical = a.severity === "critico";
  const Icon = critical ? Siren : a.severity === "advertencia" ? TriangleAlert : ICON[a.topic];
  const [showSteps, setShowSteps] = useState(big);

  // Todas se retiran solas a los 12 s para dar paso a la siguiente (la máxima también se puede "Atender" antes).
  useEffect(() => {
    const t = setTimeout(onClose, AUTO_CLOSE_MS);
    return () => clearTimeout(t);
  }, [onClose]);

  // Parpadeo según prioridad (IEC 60601-1-8): alta ~2 Hz, media ~0,6 Hz, baja fija.
  const blink = critical ? 0.5 : a.severity === "advertencia" ? 1.6 : 0;

  return (
    <div
      role={critical ? "alertdialog" : "status"}
      aria-live={critical ? "assertive" : "polite"}
      aria-label={`${LEVEL[a.severity]}. ${a.text}`}
      // Entrada con animación CSS: la tarjeta siempre termina visible aunque el navegador pause las animaciones.
      className={cn(
        "pointer-events-auto relative w-full overflow-hidden rounded-2xl border-2 bg-[#0b111c]/95 shadow-2xl shadow-black/70 backdrop-blur-md",
        !calm && (big ? "alert-pop-in-top" : "alert-pop-in-side"),
      )}
      style={{ borderColor: meta.hex }}
    >
      {blink > 0 && !calm && (
        <motion.span
          className="pointer-events-none absolute inset-0"
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: blink, repeat: Infinity }}
          style={{ boxShadow: `inset 0 0 40px 4px ${meta.hex}88` }}
        />
      )}
      {/* Franja superior con el nivel */}
      <div className="relative flex items-center gap-2 px-4 py-2" style={{ background: `${meta.hex}26` }}>
        <motion.span
          animate={blink && !calm ? { opacity: [1, 0.25, 1] } : undefined}
          transition={{ duration: blink || 1, repeat: Infinity }}
          className="flex items-center gap-2"
          style={{ color: meta.hex }}
        >
          <Icon className={big ? "size-5" : "size-4"} />
          <span className={cn("font-black tracking-[0.18em] uppercase", big ? "text-sm" : "text-xs")}>{LEVEL[a.severity]}</span>
        </motion.span>
        <span className="text-[11px] font-semibold text-muted uppercase">· {SUBLEVEL[a.severity]}</span>
        <span className="ml-auto text-[11px] text-muted tabular-nums">{a.time}</span>
        {a.engine && (
          <span className="flex items-center gap-1 text-[10px] text-muted" title={a.engine === "elevenlabs" ? "Voz de ElevenLabs" : "Voz del navegador (respaldo)"}>
            {a.engine === "elevenlabs" ? <AudioLines className="size-3" /> : <Volume2 className="size-3" />}
            {a.engine === "elevenlabs" ? "ElevenLabs" : "voz del navegador"}
          </span>
        )}
        {!critical && (
          <button type="button" onClick={onClose} aria-label="Cerrar alerta" className="rounded-md p-1 text-muted hover:text-fg">
            <X className="size-4" />
          </button>
        )}
      </div>

      <div className={cn("relative flex flex-col gap-3", big ? "p-5" : "p-4")}>
        {/* El nombre va primero */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <Who a={a} big={big} color={meta.hex} />
          <div className="shrink-0 text-right">
            <p className={cn("leading-none font-black tabular-nums", big ? "text-[30px]" : "text-xl")} style={{ color: meta.hex }}>
              {a.group ? a.valueText.split(" · ").length : a.valueText}
            </p>
            <p className="mt-1 text-[11px] text-muted">{a.group ? "afectados" : a.title}</p>
          </div>
        </div>

        <p className={cn("leading-snug font-semibold", big ? "text-[17px]" : "text-[15px]")}>{a.text}</p>
        {a.group && <p className="text-xs text-muted">{a.valueText}</p>}
        {a.topic !== "bone" && !a.group && <SignalLine topic={a.topic} color={meta.hex} calm={calm} />}

        <button type="button" onClick={() => setShowSteps((v) => !v)} className="flex w-fit items-center gap-1.5 text-xs font-semibold text-primary">
          <ListChecks className="size-4" /> {showSteps ? "Ocultar pasos" : "Qué hacer ahora"}
        </button>
        <Steps a={a} color={meta.hex} open={showSteps} />

        <div className="flex flex-wrap gap-2">
          {critical && (
            <button
              type="button"
              onClick={() => {
                mute();
                onClose();
              }}
              className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold text-white"
              style={{ background: meta.hex }}
            >
              <Check className="size-4" /> Atender
            </button>
          )}
          <Link
            href={a.group ? "/astronauts" : `/astronauts/${a.astronautId}`}
            onClick={onClose}
            className={cn("rounded-xl px-3.5 py-2 text-xs font-semibold", critical ? "border border-border hover:border-primary/60" : "text-white")}
            style={critical ? undefined : { background: meta.hex }}
          >
            {a.group ? "Ver astronautas" : "Ver astronauta"}
          </Link>
          <Link href="/alerts" onClick={onClose} className="rounded-xl border border-border px-3.5 py-2 text-xs font-semibold hover:border-primary/60">
            Ver alerta
          </Link>
          {voiceOn && (
            <button
              type="button"
              onClick={mute}
              className="flex items-center gap-1 rounded-xl border border-border px-3.5 py-2 text-xs font-semibold text-muted hover:text-fg"
            >
              <VolumeX className="size-3.5" /> Silenciar voz
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Alarma maestra (máxima) al centro + pila de alertas leves y graves a la derecha. */
const PING_EVERY_MS = 6000;

export function AlertPopups() {
  const { items, dismiss, voiceOn, silenced, pending, nextIn } = useAlertPopup();
  const calm = useReducedMotion() ?? false;
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- el portal solo existe en el navegador
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!items.length) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && dismiss(items[0].id);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [items, dismiss]);

  // Mientras haya una alerta máxima sin atender, un pitido de recordatorio (como en la UCI).
  const masterId = items.find((a) => a.severity === "critico")?.id;
  useEffect(() => {
    if (!masterId || !voiceOn || silenced) return;
    const id = setInterval(alarmPing, PING_EVERY_MS);
    return () => clearInterval(id);
  }, [masterId, voiceOn, silenced]);

  if (!mounted) return null;
  const master = items.find((a) => a.severity === "critico");
  const others = items.filter((a) => a !== master);
  const hidden = Math.max(0, others.length - VISIBLE);

  return createPortal(
    <>
      {/* Viñeta roja en los bordes de la pantalla mientras haya una alerta máxima */}
      {master && (
        <div
          className={cn("pointer-events-none fixed inset-0 z-[110]", !calm && "alert-vignette")}
          style={{ boxShadow: `inset 0 0 160px 10px ${STATUS_META.critico.hex}66`, opacity: 0.6 }}
        />
      )}
      {/* Si hay más alertas a la derecha, la alarma maestra se corre a la izquierda para no taparlas. */}
      <div
        className={cn(
          "pointer-events-none fixed top-5 z-[121] w-[min(720px,calc(100vw-32px))]",
          others.length ? "left-1/2 -translate-x-1/2 xl:left-[max(16px,calc(50%-480px))] xl:translate-x-0" : "left-1/2 -translate-x-1/2",
        )}
      >
        {master && <PopupCard key={master.id} a={master} big />}
      </div>
      <div
        className={cn(
          "pointer-events-none fixed right-4 z-[120] flex w-[440px] max-w-[calc(100vw-32px)] flex-col gap-3",
          master ? "top-auto bottom-6" : "top-20",
        )}
      >
        {others.slice(0, VISIBLE).map((a) => (
          <PopupCard key={a.id} a={a} />
        ))}
        {hidden > 0 && <p className="pointer-events-auto self-end rounded-full bg-surface px-3 py-1 text-[11px] text-muted">+{hidden} alertas más</p>}
        {pending > 0 && (
          <p className="pointer-events-auto self-end rounded-full border border-border bg-surface/95 px-3 py-1.5 text-[11px] text-muted shadow-lg">
            {pending} {pending === 1 ? "alerta" : "alertas"} en espera
            {items.some((x) => x.severity === "critico")
              ? nextIn
                ? ` · la siguiente en ${nextIn} s (después de atender la actual)`
                : " · sale al atender la actual"
              : nextIn !== null
                ? ` · la siguiente en ${nextIn} s`
                : ""}
          </p>
        )}
      </div>
    </>,
    document.body,
  );
}

/** Botón de la barra superior: activa la voz (los navegadores exigen un clic antes de reproducir audio). */
export function VoiceToggle() {
  const { voiceOn, setVoice, autoOn, setAuto } = useAlertPopup();
  return (
    <>
    <motion.button
      type="button"
      whileTap={{ scale: 0.92 }}
      onClick={() => setAuto(!autoOn)}
      aria-pressed={autoOn}
      title={autoOn ? "Apagar las alertas emergentes" : "Encender las alertas emergentes (una cada 15 s)"}
      className={cn(
        "flex h-10 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-colors",
        autoOn ? "border-critico/50 bg-critico/10 text-critico" : "border-border bg-surface text-muted hover:text-fg",
      )}
    >
      <Siren className="size-4" />
      <span className="hidden md:inline">{autoOn ? "Alertas activas" : "Alertas apagadas"}</span>
    </motion.button>
    <motion.button
      type="button"
      whileTap={{ scale: 0.92 }}
      onClick={() => setVoice(!voiceOn)}
      aria-pressed={voiceOn}
      title={voiceOn ? "Desactivar la voz de las alertas" : "Activar la voz de las alertas"}
      className={cn(
        "flex h-10 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-colors",
        voiceOn ? "border-primary/50 bg-primary/15 text-primary" : "border-border bg-surface text-muted hover:text-fg",
      )}
    >
      {voiceOn ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
      <span className="hidden sm:inline">{voiceOn ? "Voz activa" : "Activar voz"}</span>
    </motion.button>
    </>
  );
}
