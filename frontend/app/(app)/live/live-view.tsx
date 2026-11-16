"use client";

// Medición en vivo: la cámara sigue el cuerpo del astronauta y al costado se ven las cuatro mediciones
// del dispositivo (ritmo cardíaco, oxigenación, temperatura y movimiento).
// Hoy es una carcasa: el dispositivo todavía no está conectado, así que los valores se SIMULAN a partir
// de cuánto se mueve la persona frente a la cámara. Cuando exista el backend, `tick()` se reemplaza por
// las lecturas reales y la pantalla no cambia.
import type { PoseLandmarker } from "@mediapipe/tasks-vision";
import { Activity, Camera, CameraOff, Droplets, HeartPulse, ScanEye, ShieldCheck, Thermometer, type LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { MissionClock, PageHeader } from "@/components/ui/animated";
import { Button, Card, LiveBadge, Pill, type PillTone } from "@/components/ui/primitives";
import type { Vitals } from "@/lib/types";
import { translate } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { BONES, JOINTS, loadPose } from "@/services/pose";

type CamStatus = "off" | "asking" | "loading" | "on" | "denied" | "unavailable" | "model-error";
interface Person {
  id: string;
  name: string;
  baseline: Vitals;
}
interface Reading {
  hr: number;
  spo2: number;
  temp: number;
  move: number; // 0-100
}
type Key = keyof Reading;

const WORK_H = 360;
const POINTS = 70; // puntos que se guardan para las gráficas
const TICK_MS = 250;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

const hrZone = (v: number): { label: string; tone: PillTone } =>
  v < 90 ? { label: "En reposo", tone: "normal" } : v < 115 ? { label: "Actividad ligera", tone: "primary" } : v < 140 ? { label: "Esfuerzo", tone: "atencion" } : { label: "Esfuerzo intenso", tone: "advertencia" };
const spo2Zone = (v: number): { label: string; tone: PillTone } => (v >= 95 ? { label: "Normal", tone: "normal" } : { label: "Baja leve", tone: "atencion" });
const tempZone = (v: number): { label: string; tone: PillTone } => (v < 37.3 ? { label: "Normal", tone: "normal" } : { label: "Sube por esfuerzo", tone: "atencion" });
const moveZone = (v: number): { label: string; tone: PillTone } =>
  v < 8 ? { label: "Quieto", tone: "muted" } : v < 35 ? { label: "Movimiento leve", tone: "normal" } : v < 70 ? { label: "Movimiento moderado", tone: "atencion" } : { label: "Movimiento fuerte", tone: "advertencia" };

function Sparkline({ series, min, max }: { series: { data: number[]; color: string; key: string }[]; min: number; max: number }) {
  return (
    <svg viewBox="0 0 100 36" preserveAspectRatio="none" className="size-full">
      {series.map(({ data, color, key }) => {
        if (data.length < 2) return null;
        const pts = data.map((v, i) => [(i / (POINTS - 1)) * 100, 34 - clamp((v - min) / (max - min), 0, 1) * 30] as const);
        const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
        return (
          <g key={key}>
            <defs>
              <linearGradient id={key} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={color} stopOpacity={series.length > 1 ? 0.18 : 0.35} />
                <stop offset="1" stopColor={color} stopOpacity="0" />
              </linearGradient>
            </defs>
            <polygon points={`${pts[0][0]},36 ${line} ${pts[pts.length - 1][0]},36`} fill={`url(#${key})`} />
            <polyline points={line} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </g>
        );
      })}
    </svg>
  );
}

interface Shown {
  name: string;
  color: string;
  value: string;
  data: number[];
}

function Metric({
  icon: Icon, label, unit, zone, sub, people, min, max, color, id, pulse,
}: {
  icon: LucideIcon; label: string; unit: string; zone: { label: string; tone: PillTone }; sub: string;
  people: Shown[]; min: number; max: number; color: string; id: string; pulse?: number;
}) {
  const two = people.length > 1;
  return (
    <Card className="flex h-full min-h-0 items-stretch gap-3 overflow-hidden p-3.5">
      <div className="flex min-w-0 shrink-0 flex-col justify-between gap-1.5">
        <span className="flex items-center gap-2 text-[13px] font-semibold whitespace-nowrap">
          <motion.span
            className="flex size-7 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${color}26`, color }}
            animate={pulse ? { scale: [1, 1.18, 1] } : undefined}
            transition={pulse ? { duration: 60 / pulse, repeat: Infinity, ease: "easeOut" } : undefined}
          >
            <Icon className="size-4" />
          </motion.span>
          {label}
        </span>
        {two ? (
          <div className="flex items-end gap-4">
            {people.map((p) => (
              <p key={p.name} className="leading-none">
                <span className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-muted">
                  <span className="size-2 rounded-full" style={{ backgroundColor: p.color }} /> {p.name}
                </span>
                <span className="font-mono text-[24px] font-bold tabular-nums">{p.value}</span>
              </p>
            ))}
            <span className="pb-0.5 text-xs font-semibold text-muted">{unit}</span>
          </div>
        ) : (
          <p className="font-mono text-[30px] leading-none font-bold tabular-nums">
            {people[0].value}
            <span className="ml-1.5 text-xs font-semibold text-muted">{unit}</span>
          </p>
        )}
        {!two && <p className="text-[11px] text-muted">{sub}</p>}
      </div>
      <div className="flex min-w-0 flex-1 flex-col items-end gap-1.5">
        <Pill tone={zone.tone} className="py-0.5">{zone.label}</Pill>
        <div className="min-h-10 w-full flex-1">
          <Sparkline series={people.map((p, i) => ({ data: p.data, color: two ? p.color : color, key: `${id}-${i}` }))} min={min} max={max} />
        </div>
      </div>
    </Card>
  );
}

const WHO = ["#38bdf8", "#e879f9"]; // color de cada persona seguida
const first = (name: string) => name.split(" ")[0];
const emptyHist = (): Record<Key, number[]> => ({ hr: [], spo2: [], temp: [], move: [] });

export function LiveView({ astronauts }: { astronauts: Person[] }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const poseRef = useRef<PoseLandmarker | null>(null);
  const activityRef = useRef([0, 0]); // 0-1: qué tanto se mueve cada persona ahora mismo
  const namesRef = useRef(["", ""]);
  const [status, setStatus] = useState<CamStatus>("off");
  const [tracked, setTracked] = useState([false, false]);
  const [fps, setFps] = useState(0);
  const [ids, setIds] = useState([astronauts[0]?.id ?? "", astronauts[1]?.id ?? astronauts[0]?.id ?? ""]);
  const [ratio, setRatio] = useState(16 / 9);
  const p1 = astronauts.find((a) => a.id === ids[0]) ?? astronauts[0];
  const p2 = astronauts.find((a) => a.id === ids[1]) ?? astronauts[0];
  const b1 = p1.baseline;
  const b2 = p2.baseline;
  const [now, setNow] = useState<Reading[]>([
    { hr: b1.hr, spo2: b1.spo2, temp: b1.temp, move: 0 },
    { hr: b2.hr, spo2: b2.spo2, temp: b2.temp, move: 0 },
  ]);
  const [hist, setHist] = useState([emptyHist(), emptyHist()]);

  useEffect(() => {
    namesRef.current = [p1.name, p2.name];
  }, [p1.name, p2.name]);

  // Lecturas del dispositivo de cada persona. SIMULADAS: reaccionan al movimiento que ve la cámara.
  useEffect(() => {
    const bases = [
      { hr: b1.hr, spo2: b1.spo2, temp: b1.temp },
      { hr: b2.hr, spo2: b2.spo2, temp: b2.temp },
    ];
    const st = bases.map((b) => ({ ...b, move: 0, effort: 0 })); // effort: esfuerzo acumulado, sube y baja despacio
    const dt = TICK_MS / 1000;
    const noise = (a: number) => (Math.random() - 0.5) * a;
    const tick = () => {
      const out = st.map((s, i) => {
        const b = bases[i];
        const a = activityRef.current[i];
        s.move += (a - s.move) * 0.55;
        s.effort += (a - s.effort) * (dt / 10);
        // El pulso sube rápido con el movimiento y se recupera despacio.
        const hrTarget = b.hr + 85 * Math.pow(a, 0.8);
        s.hr = clamp(s.hr + (hrTarget - s.hr) * (hrTarget > s.hr ? dt / 2.5 : dt / 8) + noise(0.9), 40, 185);
        s.spo2 = clamp(s.spo2 + (b.spo2 - 3.2 * s.effort - s.spo2) * (dt / 3) + noise(0.08), 90, 100);
        s.temp = clamp(s.temp + (b.temp + 0.9 * s.effort - s.temp) * (dt / 12) + noise(0.006), 35.5, 39);
        return { hr: s.hr, spo2: s.spo2, temp: s.temp, move: s.move * 100 } satisfies Reading;
      });
      setNow(out);
      setHist((h) =>
        h.map((x, i) => ({
          hr: [...x.hr.slice(1 - POINTS), out[i].hr],
          spo2: [...x.spo2.slice(1 - POINTS), out[i].spo2],
          temp: [...x.temp.slice(1 - POINTS), out[i].temp],
          move: [...x.move.slice(1 - POINTS), out[i].move],
        })),
      );
    };
    const id = setInterval(tick, TICK_MS);
    return () => clearInterval(id);
  }, [b1.hr, b1.spo2, b1.temp, b2.hr, b2.spo2, b2.temp]);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    activityRef.current = [0, 0];
    setTracked([false, false]);
    setStatus("off");
  }, []);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("unavailable");
      return;
    }
    setStatus("asking");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      const v = videoRef.current;
      if (v) {
        v.srcObject = stream;
        await v.play().catch(() => undefined);
        if (v.videoWidth && v.videoHeight) setRatio(v.videoWidth / v.videoHeight);
      }
    } catch (e) {
      setStatus((e as DOMException)?.name === "NotAllowedError" ? "denied" : "unavailable");
      return;
    }
    setStatus("loading");
    try {
      poseRef.current = await loadPose({ masks: false, people: 2 });
      setStatus("on");
    } catch {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setStatus("model-error");
    }
  }, []);

  // Al salir de la pantalla se apaga la cámara.
  useEffect(() => () => streamRef.current?.getTracks().forEach((t) => t.stop()), []);

  // Seguimiento de hasta dos cuerpos, fotograma a fotograma.
  useEffect(() => {
    if (status !== "on") return;
    const v = videoRef.current;
    const c = overlayRef.current;
    const pose = poseRef.current;
    if (!v || !c || !pose) return;
    const work = document.createElement("canvas");
    const wctx = work.getContext("2d");
    const octx = c.getContext("2d");
    if (!wctx || !octx) return;

    type LM = { x: number; y: number }[];
    // Cada persona ocupa un puesto fijo (1 o 2) para no mezclar sus datos aunque el detector cambie el orden.
    const slots = [0, 1].map(() => ({ center: null as [number, number] | null, prev: null as number[] | null, act: 0, seenAt: 0 }));
    let prevAt = 0;
    let frames = 0;
    let fpsNow = 0;
    let fpsAt = performance.now();
    let statAt = 0;
    let lastTs = 0;
    let raf = 0;

    const draw = (lm: LM, i: number, act: number, cw: number, ch: number) => {
      const X = (k: number) => (1 - lm[k].x) * cw; // en espejo, igual que la imagen
      const Y = (k: number) => lm[k].y * ch;
      const color = WHO[i];
      octx.lineCap = "round";
      octx.shadowColor = color;
      octx.shadowBlur = 12;
      octx.strokeStyle = color;
      octx.lineWidth = 3;
      octx.beginPath();
      for (const [a, b] of BONES) {
        octx.moveTo(X(a), Y(a));
        octx.lineTo(X(b), Y(b));
      }
      octx.stroke();
      octx.shadowBlur = 0;
      octx.fillStyle = "#e6edf7";
      for (const k of JOINTS) {
        octx.beginPath();
        octx.arc(X(k), Y(k), 4.5, 0, Math.PI * 2);
        octx.fill();
      }
      // Recuadro de seguimiento con el nombre.
      let x1 = cw, y1 = ch, x2 = 0, y2 = 0;
      for (const k of JOINTS) {
        x1 = Math.min(x1, X(k)); x2 = Math.max(x2, X(k));
        y1 = Math.min(y1, Y(k)); y2 = Math.max(y2, Y(k));
      }
      const pad = 26;
      x1 = clamp(x1 - pad, 4, cw - 4); x2 = clamp(x2 + pad, 4, cw - 4);
      y1 = clamp(y1 - pad * 1.6, 4, ch - 4); y2 = clamp(y2 + pad, 4, ch - 4);
      const L = 22;
      octx.strokeStyle = color;
      octx.lineWidth = 2.5;
      octx.beginPath();
      for (const [px, py, sx, sy] of [[x1, y1, 1, 1], [x2, y1, -1, 1], [x1, y2, 1, -1], [x2, y2, -1, -1]]) {
        octx.moveTo(px + sx * L, py);
        octx.lineTo(px, py);
        octx.lineTo(px, py + sy * L);
      }
      octx.stroke();
      octx.font = "600 11px ui-monospace, monospace";
      const text = `${namesRef.current[i].toUpperCase()} · ${translate("MOVIMIENTO")} ${Math.round(act * 100)} %`;
      const tw = octx.measureText(text).width + 14;
      const ty = y1 > 26 ? y1 - 24 : y1 + 6;
      octx.fillStyle = "rgba(7,11,20,0.78)";
      octx.fillRect(x1, ty, tw, 19);
      octx.fillStyle = color;
      octx.fillText(text, x1 + 7, ty + 13.5);
    };

    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (v.readyState < 2 || !v.videoWidth) return;
      frames++;
      if (t - fpsAt >= 1000) {
        fpsNow = Math.round((frames * 1000) / (t - fpsAt));
        frames = 0;
        fpsAt = t;
      }
      const ww = Math.round((WORK_H * v.videoWidth) / v.videoHeight);
      if (work.width !== ww || work.height !== WORK_H) {
        work.width = ww;
        work.height = WORK_H;
      }
      wctx.drawImage(v, 0, 0, ww, WORK_H);
      const ts = Math.max(lastTs + 1, t);
      lastTs = ts;
      const dpr = window.devicePixelRatio || 1;
      const cw = c.clientWidth;
      const ch = c.clientHeight;
      if (c.width !== Math.round(cw * dpr) || c.height !== Math.round(ch * dpr)) {
        c.width = Math.round(cw * dpr);
        c.height = Math.round(ch * dpr);
      }
      octx.setTransform(dpr, 0, 0, dpr, 0, 0);
      octx.clearRect(0, 0, cw, ch);

      let poses: LM[] = [];
      try {
        poses = pose.detectForVideo(work, ts).landmarks;
      } catch {
        // un fotograma fallido no detiene el seguimiento
      }
      const dtS = prevAt ? Math.min(0.25, (t - prevAt) / 1000) : 0;
      prevAt = t;

      // A qué puesto pertenece cada cuerpo detectado: al que estaba más cerca en el fotograma anterior.
      const centers = poses.map((lm) => [(lm[23].x + lm[24].x) / 2, (lm[23].y + lm[24].y) / 2] as [number, number]);
      const owner: number[] = [-1, -1]; // puesto → índice del cuerpo
      const taken = new Set<number>();
      for (let s = 0; s < 2; s++) {
        const sc = slots[s].center;
        if (!sc) continue;
        let best = -1;
        let bestD = 0.4;
        centers.forEach((cc, p) => {
          const d = Math.hypot(cc[0] - sc[0], cc[1] - sc[1]);
          if (!taken.has(p) && d < bestD) {
            best = p;
            bestD = d;
          }
        });
        if (best >= 0) {
          owner[s] = best;
          taken.add(best);
        }
      }
      centers.forEach((_, p) => {
        if (taken.has(p)) return;
        const free = [0, 1].find((s) => owner[s] < 0 && !slots[s].center);
        if (free !== undefined) {
          owner[free] = p;
          taken.add(p);
        }
      });

      for (let s = 0; s < 2; s++) {
        const slot = slots[s];
        const lm = owner[s] >= 0 ? poses[owner[s]] : null;
        if (!lm) {
          slot.prev = null;
          slot.act += (0 - slot.act) * Math.min(1, dtS / 0.6);
          if (t - slot.seenAt > 1000) slot.center = null; // se fue: el puesto queda libre
          continue;
        }
        slot.center = centers[owner[s]];
        slot.seenAt = t;
        // Velocidad media de los puntos del cuerpo → intensidad de movimiento (0 a 1).
        const pts = JOINTS.flatMap((k) => [lm[k].x, lm[k].y]);
        if (slot.prev && dtS > 0) {
          let d = 0;
          for (let i = 0; i < pts.length; i++) d += Math.abs(pts[i] - slot.prev[i]);
          const speed = d / JOINTS.length / dtS;
          slot.act += (clamp((speed - 0.04) / 0.55, 0, 1) - slot.act) * Math.min(1, dtS / 0.35);
        }
        slot.prev = pts;
        draw(lm, s, slot.act, cw, ch);
      }
      activityRef.current = [slots[0].act, slots[1].act];

      if (t - statAt > 300) {
        statAt = t;
        setTracked([owner[0] >= 0, owner[1] >= 0]);
        setFps(fpsNow);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      activityRef.current = [0, 0];
      octx.setTransform(1, 0, 0, 1, 0, 0);
      octx.clearRect(0, 0, c.width, c.height);
    };
  }, [status]);

  const on = status === "on";
  const busy = status === "asking" || status === "loading";
  const count = Number(tracked[0]) + Number(tracked[1]);
  const two = on && tracked[1];
  const offTitle =
    status === "denied" ? "No hay permiso para usar la cámara"
      : status === "unavailable" ? "No se encontró una cámara"
        : status === "model-error" ? "No se pudo cargar el seguimiento corporal"
          : status === "asking" ? "Esperando tu permiso…"
            : status === "loading" ? "Cargando el seguimiento corporal…"
              : "La cámara está apagada";
  const offText =
    status === "denied" ? "Actívala en el candado de la barra de direcciones del navegador y vuelve a intentarlo."
      : status === "unavailable" ? "Conecta una cámara o revisa que otra aplicación no la esté usando."
        : status === "model-error" ? "Recarga la página y vuelve a intentarlo."
          : status === "loading" ? "La primera vez tarda unos segundos."
            : "Enciéndela para seguir en vivo hasta a dos astronautas y ver cómo responde su cuerpo al moverse.";

  // Qué se muestra en cada panel: una persona, o las dos si la cámara ve a la segunda.
  const who = two ? [0, 1] : [0];
  const names = [first(p1.name), first(p2.name) === first(p1.name) ? `${first(p2.name)} 2` : first(p2.name)];
  const people = (k: Key, fmt: (v: number) => string): Shown[] =>
    who.map((i) => ({ name: names[i], color: WHO[i], value: fmt(now[i][k]), data: hist[i][k] }));
  const peak = (k: Key, pick: (...v: number[]) => number) => pick(...who.map((i) => now[i][k]));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Medición en vivo"
        subtitle="La cámara sigue hasta a dos astronautas y el dispositivo muestra cómo responde su cuerpo mientras se mueven."
        actions={
          on ? (
            <Button variant="secondary" onClick={stop}>
              <CameraOff className="size-4" /> Apagar cámara
            </Button>
          ) : (
            <Button onClick={start} disabled={busy}>
              <Camera className="size-4" /> {status === "asking" ? "Esperando permiso…" : status === "loading" ? "Cargando…" : "Encender cámara"}
            </Button>
          )
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="self-start p-3">
          <div className="relative overflow-hidden rounded-xl bg-black" style={{ aspectRatio: ratio }}>
            <video ref={videoRef} muted playsInline className={cn("absolute inset-0 size-full -scale-x-100 object-fill", !on && "opacity-0")} />
            <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 size-full" />
            {on ? (
              <>
                {["top-3 left-3 border-t-2 border-l-2", "top-3 right-3 border-t-2 border-r-2", "bottom-3 left-3 border-b-2 border-l-2", "right-3 bottom-3 border-r-2 border-b-2"].map((p) => (
                  <span key={p} className={cn("pointer-events-none absolute size-7 rounded-[3px] border-primary/80", p)} />
                ))}
                <motion.span
                  className="pointer-events-none absolute inset-x-0 h-16 bg-gradient-to-b from-transparent via-primary/10 to-transparent"
                  animate={{ top: ["-10%", "100%"] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                />
                <div className="absolute top-5 left-12 flex items-center gap-2">
                  <LiveBadge />
                  <span className={cn("rounded-md px-2 py-1 text-[11px] font-semibold backdrop-blur", count ? "bg-normal/20 text-normal" : "bg-black/55 text-muted")}>
                    {count === 2 ? "2 personas detectadas" : count === 1 ? "1 persona detectada" : "Buscando astronautas…"}
                  </span>
                </div>
                <div className="absolute top-5 right-12 rounded-md bg-black/55 px-2 py-1 font-mono text-[11px] text-fg backdrop-blur">
                  <MissionClock />
                </div>
                <div className="absolute bottom-5 left-12 rounded-md bg-black/55 px-2 py-1 font-mono text-[11px] text-muted backdrop-blur">
                  {fps} FPS · seguimiento local
                </div>
                {/* Lecturas flotantes sobre el video */}
                <div className="absolute right-12 bottom-5 flex flex-col items-end gap-1.5 font-mono text-[12px] font-semibold">
                  {who.map((i) => (
                    <span key={i} className="flex items-center gap-2 rounded-md bg-black/60 px-2 py-1 backdrop-blur">
                      <span className="size-2 rounded-full" style={{ backgroundColor: WHO[i] }} />
                      <span className="text-fg">{names[i]}</span>
                      <span className="text-critico">♥ {Math.round(now[i].hr)}</span>
                      <span className="text-primary">SpO₂ {now[i].spo2.toFixed(0)} %</span>
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
                <motion.span
                  className="flex size-20 items-center justify-center rounded-full bg-primary/15 text-primary"
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                >
                  {status === "denied" || status === "unavailable" || status === "model-error" ? <CameraOff className="size-9" /> : <ScanEye className="size-9" />}
                </motion.span>
                <div className="max-w-md">
                  <p className="text-lg font-semibold">{offTitle}</p>
                  <p className="mt-1.5 text-sm text-muted">{offText}</p>
                </div>
                {!busy && (
                  <Button onClick={start}>
                    <Camera className="size-4" /> {status === "off" ? "Encender cámara" : "Volver a intentar"}
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-2 pt-3 pb-1 text-[13px]">
            {[0, 1].map((i) => (
              <label key={i} className="flex items-center gap-2">
                <span className="size-2.5 rounded-full" style={{ backgroundColor: WHO[i] }} />
                <span className="text-muted">Persona {i + 1}:</span>
                <select
                  value={ids[i]}
                  onChange={(e) => setIds((prev) => prev.map((x, k) => (k === i ? e.target.value : x)))}
                  className="cursor-pointer rounded-lg border border-border bg-surface px-2.5 py-1.5 font-semibold outline-none focus:border-primary/60"
                >
                  {astronauts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </label>
            ))}
            <Pill tone="primary">Demo · lecturas simuladas</Pill>
            <span className="ml-auto flex items-center gap-1.5 text-xs text-muted">
              <ShieldCheck className="size-4 text-normal" /> El video no se graba ni sale de este equipo
            </span>
          </div>
        </Card>

        {/* En pantalla ancha los cuatro paneles ocupan exactamente el alto de la cámara. */}
        <div className="xl:relative xl:min-h-[430px]">
          <div className="grid gap-4 sm:grid-cols-2 xl:absolute xl:inset-0 xl:grid-cols-1 xl:grid-rows-4 xl:gap-3">
            <Metric
              icon={HeartPulse} label="Ritmo cardíaco" unit="lpm" zone={hrZone(peak("hr", Math.max))} sub={`En reposo: ${b1.hr} lpm`}
              people={people("hr", (v) => String(Math.round(v)))} min={Math.min(b1.hr, b2.hr) - 15} max={Math.max(b1.hr, b2.hr) + 95}
              color="#ef4444" id="g-hr" pulse={clamp(peak("hr", Math.max), 40, 180)}
            />
            <Metric
              icon={Droplets} label="Oxigenación" unit="% SpO₂" zone={spo2Zone(peak("spo2", Math.min))} sub={`Habitual: ${b1.spo2} %`}
              people={people("spo2", (v) => v.toFixed(1))} min={92} max={100} color="#4f8cff" id="g-spo2"
            />
            <Metric
              icon={Thermometer} label="Temperatura" unit="°C" zone={tempZone(peak("temp", Math.max))} sub={`Habitual: ${b1.temp} °C`}
              people={people("temp", (v) => v.toFixed(1))} min={Math.min(b1.temp, b2.temp) - 0.3} max={Math.max(b1.temp, b2.temp) + 1.1}
              color="#f97316" id="g-temp"
            />
            <Metric
              icon={Activity} label="Movimiento" unit="%" zone={moveZone(peak("move", Math.max))}
              sub={on ? (count ? "Sensor + cámara" : "Sin persona en cuadro") : "Cámara apagada"}
              people={people("move", (v) => String(Math.round(v)))} min={0} max={100} color="#22c55e" id="g-move"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
