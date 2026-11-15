"use client";

// Masa corporal por cámara: en microgravedad no sirve una balanza, así que se estima la masa a partir
// de la forma del cuerpo. Un detector corporal (MediaPipe Pose, corre en el propio navegador) separa a la
// persona del fondo; se toma una vista de frente y otra de perfil, y con ambas se calcula el volumen
// del cuerpo por rebanadas (método de zonas elípticas). El video no se graba ni se envía a ningún servidor.
import type { PoseLandmarker } from "@mediapipe/tasks-vision";
import { Camera, CameraOff, Check, RotateCcw, ScanEye, Scale, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { MissionClock, PageHeader } from "@/components/ui/animated";
import { Button, Card, CardTitle, LiveBadge, Pill, StatusBadge } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { BONES, JOINTS, loadPose } from "@/services/pose";
import { massFromProfiles, massStatus, SLICES, type BodyRef } from "@/services/body-mass";

type CamStatus = "off" | "asking" | "loading" | "on" | "denied" | "unavailable" | "model-error";
type Phase = "frente" | "perfil" | "listo";
type Guide = "nadie" | "lejos" | "cortado" | "ponte-de-frente" | "gira-de-perfil" | "quieto" | "midiendo" | "listo";
interface Live {
  guide: Guide;
  hold: number; // 0-1: cuánto falta para tomar la vista
  fps: number;
}
interface Person extends BodyRef {
  id: string;
  name: string;
}

const WORK_H = 360; // alto de la imagen que analiza el detector
const HOLD_MS = 1300; // tiempo que hay que quedarse quieto para tomar cada vista
const STILL = 0.006; // movimiento máximo permitido entre fotogramas (fracción de la imagen)
const FACTOR_KEY = "hm-masa-factor";
const KEY_POINTS = [0, 11, 12, 23, 24, 27, 28]; // nariz, hombros, caderas y tobillos

const GUIDE: Record<Guide, { text: string; tone: "muted" | "primary" | "atencion" | "normal" }> = {
  nadie: { text: "No hay nadie en cuadro", tone: "muted" },
  lejos: { text: "Acércate un poco", tone: "atencion" },
  cortado: { text: "Aléjate: debe verse de la cabeza a los pies", tone: "atencion" },
  "ponte-de-frente": { text: "Ponte de frente a la cámara", tone: "atencion" },
  "gira-de-perfil": { text: "Ahora gira: ponte de perfil", tone: "atencion" },
  quieto: { text: "Quédate quieto un momento", tone: "atencion" },
  midiendo: { text: "Midiendo… no te muevas", tone: "primary" },
  listo: { text: "Medición completa", tone: "normal" },
};

export function CameraView({ astronauts }: { astronauts: Person[] }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const poseRef = useRef<PoseLandmarker | null>(null);
  const phaseRef = useRef<Phase>("frente");
  const frontRef = useRef<Float32Array | null>(null);
  const heightRef = useRef(170);
  const [status, setStatus] = useState<CamStatus>("off");
  const [live, setLive] = useState<Live>({ guide: "nadie", hold: 0, fps: 0 });
  const [phase, setPhaseState] = useState<Phase>("frente");
  const [rawKg, setRawKg] = useState<number | null>(null);
  const [factor, setFactor] = useState(1);
  const [realKg, setRealKg] = useState("");
  const [subject, setSubject] = useState(astronauts[0]?.id ?? "");
  const [heightCm, setHeightCm] = useState(astronauts[0]?.heightCm ?? 170);
  const [saved, setSaved] = useState<{ time: string; name: string; kg: number }[]>([]);
  const [ratio, setRatio] = useState(16 / 9);

  const setPhase = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  }, []);

  useEffect(() => {
    heightRef.current = heightCm;
  }, [heightCm]);

  // Calibración guardada en este navegador.
  useEffect(() => {
    try {
      const f = Number(window.localStorage.getItem(FACTOR_KEY));
      // eslint-disable-next-line react-hooks/set-state-in-effect -- preferencia guardada en el navegador
      if (f >= 0.6 && f <= 1.6) setFactor(f);
    } catch {
      // sin almacenamiento
    }
  }, []);

  const person = astronauts.find((a) => a.id === subject);

  const restart = useCallback(() => {
    frontRef.current = null;
    setRawKg(null);
    setPhase("frente");
  }, [setPhase]);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus("off");
    restart();
  }, [restart]);

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
      poseRef.current = await loadPose({ masks: true });
      setStatus("on");
    } catch {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setStatus("model-error");
    }
  }, []);

  // Al salir de la pantalla se apaga la cámara.
  useEffect(() => () => streamRef.current?.getTracks().forEach((t) => t.stop()), []);

  // Análisis en vivo, fotograma a fotograma.
  useEffect(() => {
    if (status !== "on") return;
    const v = videoRef.current;
    const c = overlayRef.current;
    const pose = poseRef.current;
    if (!v || !c || !pose) return;
    const work = document.createElement("canvas");
    const maskCanvas = document.createElement("canvas");
    const wctx = work.getContext("2d");
    const mctx = maskCanvas.getContext("2d");
    const octx = c.getContext("2d");
    if (!wctx || !mctx || !octx) return;

    let maskImg: ImageData | null = null;
    let rows = new Uint16Array(0);
    let prevPts: number[] | null = null;
    const sum = new Float32Array(SLICES);
    let count = 0;
    let goodSince = 0;
    let guide: Guide = "nadie";
    let hold = 0;
    let frames = 0;
    let fps = 0;
    let fpsAt = performance.now();
    let statAt = 0;
    let lastTs = 0;
    let raf = 0;

    const resetHold = () => {
      sum.fill(0);
      count = 0;
      goodSince = 0;
      hold = 0;
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (v.readyState < 2 || !v.videoWidth) return;
      frames++;
      if (now - fpsAt >= 1000) {
        fps = Math.round((frames * 1000) / (now - fpsAt));
        frames = 0;
        fpsAt = now;
      }
      const ww = Math.round((WORK_H * v.videoWidth) / v.videoHeight);
      if (work.width !== ww || work.height !== WORK_H) {
        work.width = ww;
        work.height = WORK_H;
      }
      wctx.drawImage(v, 0, 0, ww, WORK_H);
      const ts = Math.max(lastTs + 1, now);
      lastTs = ts;

      const dpr = window.devicePixelRatio || 1;
      const cw = c.clientWidth;
      const ch = c.clientHeight;
      if (c.width !== Math.round(cw * dpr) || c.height !== Math.round(ch * dpr)) {
        c.width = Math.round(cw * dpr);
        c.height = Math.round(ch * dpr);
      }

      try {
        pose.detectForVideo(work, ts, (res) => {
          const lm = res.landmarks[0];
          const mask = res.segmentationMasks?.[0];
          octx.setTransform(dpr, 0, 0, dpr, 0, 0);
          octx.clearRect(0, 0, cw, ch);
          if (!lm || !mask) {
            mask?.close();
            guide = "nadie";
            prevPts = null;
            resetHold();
            return;
          }

          // Silueta: cuántos puntos de cada fila pertenecen al cuerpo.
          const mw = mask.width;
          const mh = mask.height;
          const data = mask.getAsFloat32Array();
          if (!maskImg || maskImg.width !== mw || maskImg.height !== mh) {
            maskImg = mctx.createImageData(mw, mh);
            maskCanvas.width = mw;
            maskCanvas.height = mh;
            rows = new Uint16Array(mh);
            for (let i = 0; i < mw * mh; i++) {
              maskImg.data[i * 4] = 56;
              maskImg.data[i * 4 + 1] = 189;
              maskImg.data[i * 4 + 2] = 248;
            }
          }
          const minRow = Math.max(3, mw * 0.008);
          let top = -1;
          let bottom = -1;
          let area = 0;
          for (let y = 0; y < mh; y++) {
            let n = 0;
            for (let x = 0; x < mw; x++) {
              const i = y * mw + x;
              const on = data[i] > 0.5;
              if (on) n++;
              maskImg.data[i * 4 + 3] = on ? 105 : 0;
            }
            rows[y] = n;
            if (n >= minRow) {
              if (top < 0) top = y;
              bottom = y;
              area += n;
            }
          }
          mask.close();
          const pxH = bottom - top + 1;

          // Qué tanto se movió desde el fotograma anterior.
          const pts = KEY_POINTS.flatMap((k) => [lm[k].x, lm[k].y]);
          let moved = 1;
          if (prevPts) {
            moved = 0;
            for (let i = 0; i < pts.length; i++) moved += Math.abs(pts[i] - prevPts[i]);
            moved /= pts.length;
          }
          prevPts = pts;

          // De frente los hombros se ven anchos; de perfil casi se juntan.
          const shoulders = (Math.abs(lm[11].x - lm[12].x) * mw) / pxH;
          const p = phaseRef.current;
          if (p === "listo") guide = "listo";
          else if (top < 0 || area < mw * mh * 0.02) guide = "nadie";
          else if (top <= mh * 0.01 || bottom >= mh * 0.99 - 1) guide = "cortado";
          else if (pxH < mh * 0.5) guide = "lejos";
          else if (p === "frente" && shoulders < 0.17) guide = "ponte-de-frente";
          else if (p === "perfil" && shoulders > 0.11) guide = "gira-de-perfil";
          else if (moved > STILL) guide = "quieto";
          else guide = "midiendo";

          if (guide === "midiendo") {
            // La estatura conocida da la escala: cuántos metros mide cada punto de la imagen.
            const hM = heightRef.current / 100;
            const mPerPx = hM / pxH;
            for (let i = 0; i < SLICES; i++) sum[i] += rows[Math.min(mh - 1, Math.floor(top + ((i + 0.5) / SLICES) * pxH))] * mPerPx;
            count++;
            goodSince ||= now;
            hold = Math.min(1, (now - goodSince) / HOLD_MS);
            if (hold >= 1) {
              const profile = sum.map((s) => s / count);
              if (p === "frente") {
                frontRef.current = profile;
                setPhase("perfil");
              } else if (frontRef.current) {
                setRawKg(massFromProfiles(frontRef.current, profile, hM));
                setPhase("listo");
              }
              resetHold();
            }
          } else resetHold();

          // Dibujo encima del video (en espejo, igual que la imagen).
          const color = guide === "listo" ? "#22c55e" : guide === "midiendo" ? "#4f8cff" : "#eab308";
          mctx.putImageData(maskImg, 0, 0);
          octx.save();
          octx.translate(cw, 0);
          octx.scale(-1, 1);
          octx.drawImage(maskCanvas, 0, 0, cw, ch);
          octx.restore();
          octx.strokeStyle = "rgba(230,237,247,0.85)";
          octx.lineWidth = 2;
          octx.beginPath();
          for (const [a, b] of BONES) {
            octx.moveTo((1 - lm[a].x) * cw, lm[a].y * ch);
            octx.lineTo((1 - lm[b].x) * cw, lm[b].y * ch);
          }
          octx.stroke();
          octx.fillStyle = color;
          for (const k of JOINTS) {
            octx.beginPath();
            octx.arc((1 - lm[k].x) * cw, lm[k].y * ch, 4, 0, Math.PI * 2);
            octx.fill();
          }
          if (top >= 0) {
            // Regla de estatura: de la cabeza a los pies.
            const y1 = (top / mh) * ch;
            const y2 = ((bottom + 1) / mh) * ch;
            octx.strokeStyle = color;
            octx.setLineDash([6, 5]);
            octx.beginPath();
            octx.moveTo(24, y1);
            octx.lineTo(cw - 24, y1);
            octx.moveTo(24, y2);
            octx.lineTo(cw - 24, y2);
            octx.stroke();
            octx.setLineDash([]);
            octx.beginPath();
            octx.moveTo(34, y1);
            octx.lineTo(34, y2);
            octx.stroke();
            octx.font = "600 11px ui-monospace, monospace";
            octx.fillText(`${heightRef.current} cm`, 42, (y1 + y2) / 2);
          }
        });
      } catch {
        // un fotograma fallido no detiene el análisis
      }

      if (now - statAt > 150) {
        statAt = now;
        setLive({ guide, hold, fps });
      }
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      octx.setTransform(1, 0, 0, 1, 0, 0);
      octx.clearRect(0, 0, c.width, c.height);
    };
  }, [status, setPhase]);

  const on = status === "on";
  const busy = status === "asking" || status === "loading";
  const guide = GUIDE[live.guide];
  const kg = rawKg !== null ? rawKg * factor : null;
  const delta = kg !== null && person ? kg - person.preflightKg : null;
  const deltaPct = delta !== null && person ? (delta / person.preflightKg) * 100 : null;
  const step = !on ? 1 : phase === "frente" ? 2 : phase === "perfil" ? 3 : 4;
  const STEPS = ["Enciende la cámara", "Párate de frente, de cuerpo entero, y quédate quieto", "Gira y ponte de perfil, sin moverte", "Listo: guarda la medición"];

  const calibrate = () => {
    const real = Number(realKg.replace(",", "."));
    if (!rawKg || !(real > 20 && real < 250)) return;
    const f = Math.min(1.6, Math.max(0.6, real / rawKg));
    setFactor(f);
    setRealKg("");
    try {
      window.localStorage.setItem(FACTOR_KEY, String(f));
    } catch {
      // sin almacenamiento
    }
  };
  const uncalibrate = () => {
    setFactor(1);
    try {
      window.localStorage.removeItem(FACTOR_KEY);
    } catch {
      // sin almacenamiento
    }
  };

  const offTitle =
    status === "denied"
      ? "No hay permiso para usar la cámara"
      : status === "unavailable"
        ? "No se encontró una cámara"
        : status === "model-error"
          ? "No se pudo cargar el detector corporal"
          : status === "asking"
            ? "Esperando tu permiso…"
            : status === "loading"
              ? "Cargando el detector corporal…"
              : "La cámara está apagada";
  const offText =
    status === "denied"
      ? "Actívala en el candado de la barra de direcciones del navegador y vuelve a intentarlo."
      : status === "unavailable"
        ? "Conecta una cámara o revisa que otra aplicación no la esté usando."
        : status === "model-error"
          ? "Recarga la página y vuelve a intentarlo."
          : status === "loading"
            ? "La primera vez tarda unos segundos."
            : "Enciéndela para estimar la masa corporal del astronauta. El navegador te pedirá permiso.";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Masa corporal"
        subtitle="En el espacio no sirve una balanza: la cámara estima la masa del astronauta a partir de la forma de su cuerpo."
        actions={
          on ? (
            <>
              <Button variant="secondary" onClick={restart}>
                <RotateCcw className="size-4" /> Medir de nuevo
              </Button>
              <Button variant="secondary" onClick={stop}>
                <CameraOff className="size-4" /> Apagar cámara
              </Button>
            </>
          ) : (
            <Button onClick={start} disabled={busy}>
              <Camera className="size-4" /> {status === "asking" ? "Esperando permiso…" : status === "loading" ? "Cargando…" : "Encender cámara"}
            </Button>
          )
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="p-3">
          <div className="relative overflow-hidden rounded-xl bg-black" style={{ aspectRatio: ratio }}>
            <video ref={videoRef} muted playsInline className={cn("absolute inset-0 size-full -scale-x-100 object-fill", !on && "opacity-0")} />
            <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 size-full" />

            {on ? (
              <>
                {["top-3 left-3 border-t-2 border-l-2", "top-3 right-3 border-t-2 border-r-2", "bottom-3 left-3 border-b-2 border-l-2", "right-3 bottom-3 border-r-2 border-b-2"].map((p) => (
                  <span key={p} className={cn("pointer-events-none absolute size-7 rounded-[3px] border-primary/80", p)} />
                ))}
                <div className="absolute top-5 left-12 flex items-center gap-2">
                  <LiveBadge />
                  <span className="rounded-md bg-black/55 px-2 py-1 font-mono text-[11px] text-fg backdrop-blur">{person?.name ?? "Sin asignar"}</span>
                  <span className="rounded-md bg-primary/80 px-2 py-1 text-[11px] font-semibold text-white">
                    {phase === "frente" ? "Vista 1 de 2 · de frente" : phase === "perfil" ? "Vista 2 de 2 · de perfil" : "Completo"}
                  </span>
                </div>
                <div className="absolute top-5 right-12 rounded-md bg-black/55 px-2 py-1 font-mono text-[11px] text-fg backdrop-blur">
                  <MissionClock />
                </div>
                <div className="absolute bottom-5 left-12 rounded-md bg-black/55 px-2 py-1 font-mono text-[11px] text-muted backdrop-blur">
                  {live.fps} FPS · análisis local
                </div>
                <div className="absolute bottom-5 left-1/2 flex w-64 -translate-x-1/2 flex-col items-center gap-2">
                  <span className={cn("rounded-full bg-black/70 px-4 py-1.5 text-center text-[13px] font-semibold backdrop-blur", guide.tone === "normal" ? "text-normal" : guide.tone === "primary" ? "text-primary" : guide.tone === "atencion" ? "text-atencion" : "text-muted")}>
                    {guide.text}
                  </span>
                  {phase !== "listo" && (
                    <span className="h-1.5 w-full overflow-hidden rounded-full bg-black/60">
                      <span className="block h-full rounded-full bg-primary transition-[width] duration-150" style={{ width: `${live.hold * 100}%` }} />
                    </span>
                  )}
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

          <div className="flex flex-wrap items-center gap-3 px-2 pt-3 pb-1 text-[13px]">
            <label className="flex items-center gap-2">
              <span className="text-muted">Astronauta:</span>
              <select
                value={subject}
                onChange={(e) => {
                  setSubject(e.target.value);
                  const p = astronauts.find((a) => a.id === e.target.value);
                  if (p) setHeightCm(p.heightCm);
                  restart();
                }}
                className="cursor-pointer rounded-lg border border-border bg-surface px-2.5 py-1.5 font-semibold outline-none focus:border-primary/60"
              >
                {astronauts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2" title="La estatura sirve de escala: con ella el sistema sabe cuánto mide cada punto de la imagen">
              <span className="text-muted">Estatura:</span>
              <input
                type="number"
                min={120}
                max={220}
                value={heightCm}
                onChange={(e) => setHeightCm(Math.min(220, Math.max(120, Number(e.target.value) || 170)))}
                className="w-20 rounded-lg border border-border bg-surface px-2.5 py-1.5 font-mono font-semibold outline-none focus:border-primary/60"
              />
              <span className="text-muted">cm</span>
            </label>
            <span className="ml-auto flex items-center gap-1.5 text-xs text-muted">
              <ShieldCheck className="size-4 text-normal" /> El video no se graba ni sale de este equipo
            </span>
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardTitle
              title="Masa estimada"
              subtitle={person ? `${person.name} · antes del vuelo: ${person.preflightKg} kg` : undefined}
              right={<Scale className="size-5 text-primary" />}
            />
            <div className="flex items-end justify-between gap-3">
              <p className="font-mono text-5xl font-bold tabular-nums">
                {kg !== null ? kg.toFixed(1) : "—"}
                <span className="ml-1.5 text-lg text-muted">kg</span>
              </p>
              {deltaPct !== null && <StatusBadge status={massStatus(deltaPct)} />}
            </div>
            <div className="mt-4 rounded-lg bg-surface-2 p-3 text-[13px]">
              <p className="text-xs text-muted">Cambio desde antes del vuelo</p>
              <p className="mt-0.5 font-mono font-semibold tabular-nums">
                {delta !== null && deltaPct !== null ? `${delta > 0 ? "+" : ""}${delta.toFixed(1)} kg (${deltaPct > 0 ? "+" : ""}${deltaPct.toFixed(1)} %)` : "—"}
              </p>
            </div>
            <Button
              className="mt-4 w-full justify-center"
              disabled={kg === null}
              onClick={() => {
                if (kg === null) return;
                const time = new Date().toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
                setSaved((s) => [{ time, name: person?.name ?? "—", kg }, ...s].slice(0, 5));
              }}
            >
              <Check className="size-4" /> Guardar medición
            </Button>
            {saved.length > 0 && (
              <ul className="mt-3 flex flex-col gap-1.5 text-[13px]">
                {saved.map((m, i) => (
                  <li key={`${m.time}-${i}`} className="flex items-center justify-between gap-2 rounded-lg bg-surface-2 px-3 py-2">
                    <span className="truncate">{m.name}</span>
                    <span className="font-mono text-muted">{m.time}</span>
                    <span className="font-mono font-semibold">{m.kg.toFixed(1)} kg</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardTitle title="Cómo medir" />
            <ol className="flex flex-col gap-2.5 text-[13px]">
              {STEPS.map((s, i) => (
                <li key={s} className={cn("flex items-center gap-2.5", i + 1 === step ? "font-semibold text-fg" : "text-muted")}>
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full font-mono text-xs",
                      i + 1 < step ? "bg-normal/15 text-normal" : i + 1 === step ? "bg-primary text-white" : "bg-surface-2",
                    )}
                  >
                    {i + 1 < step ? <Check className="size-3.5" /> : i + 1}
                  </span>
                  {s}
                </li>
              ))}
            </ol>
            <p className="mt-3 text-xs text-muted">Ropa ajustada y brazos pegados al cuerpo dan un mejor resultado.</p>
          </Card>

          <Card>
            <CardTitle
              title="Calibración"
              right={<Pill tone={factor === 1 ? "muted" : "normal"}>{factor === 1 ? "Sin calibrar" : `Ajuste ×${factor.toFixed(2)}`}</Pill>}
            />
            <p className="text-[13px] leading-relaxed text-muted">
              El sistema corta el cuerpo en {SLICES} rebanadas: de frente ve el ancho y de perfil el fondo, y con eso calcula el volumen y la masa.
              Si conoces el peso real de la persona que se acaba de medir, escríbelo para afinar el cálculo.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <input
                inputMode="decimal"
                placeholder="Peso real (kg)"
                value={realKg}
                onChange={(e) => setRealKg(e.target.value)}
                disabled={rawKg === null}
                className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 font-mono text-[13px] outline-none focus:border-primary/60 disabled:opacity-50"
              />
              <Button variant="secondary" onClick={calibrate} disabled={rawKg === null || !realKg}>
                <SlidersHorizontal className="size-4" /> Calibrar
              </Button>
            </div>
            {factor !== 1 && (
              <button type="button" onClick={uncalibrate} className="mt-2 text-xs font-semibold text-muted underline-offset-2 hover:text-fg hover:underline">
                Quitar calibración
              </button>
            )}
            <p className="mt-3 text-xs text-muted">Es una estimación, no una medida médica: la ropa y la postura cambian el resultado.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
