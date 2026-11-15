"use client";

// Cámara en vivo para el gemelo muscular (solo frontend, sin backend): sigue el cuerpo como el tracker de
// "Medición en vivo" y varias veces por segundo entrega un escaneo armado en este equipo, para que el
// modelo 3D se mueva y cambie con la persona. El video no se graba ni se envía a ningún lado.
import type { PoseLandmarker } from "@mediapipe/tasks-vision";
import { Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { scanFromPose, type MuscleScan, type PosePoint } from "@/services/muscle-scan";
import { BONES, JOINTS, loadPose } from "@/services/pose";

type Stage = "asking" | "loading" | "on" | "denied" | "unavailable" | "error";
/** Inclinación del cuerpo en pantalla (radianes): `roll` hacia un lado, `yaw` girando sobre sí mismo. */
export interface Lean {
  roll: number;
  yaw: number;
}

const WORK_H = 360;
const EMIT_MS = 140; // cada cuánto se entrega un escaneo nuevo al modelo
const SMOOTH = 0.35; // suavizado de los puntos (0 = no cambia, 1 = sin suavizar)

export function CameraScan({ crewId, onFrame, onClose }: {
  crewId: string;
  onFrame: (scan: MuscleScan, lean: Lean) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const poseRef = useRef<PoseLandmarker | null>(null);
  const frameRef = useRef(onFrame);
  const [stage, setStage] = useState<Stage>("asking");
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    frameRef.current = onFrame;
  }, [onFrame]);

  // Enciende la cámara y carga el detector.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) return setStage("unavailable");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } } });
        if (cancelled) return stream.getTracks().forEach((t) => t.stop());
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
      } catch (e) {
        if (!cancelled) setStage((e as DOMException)?.name === "NotAllowedError" ? "denied" : "unavailable");
        return;
      }
      setStage("loading");
      try {
        poseRef.current = await loadPose({ masks: false, people: 1 });
        if (!cancelled) setStage("on");
      } catch {
        if (!cancelled) setStage("error");
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  // Seguimiento continuo.
  useEffect(() => {
    if (stage !== "on") return;
    const v = videoRef.current;
    const c = overlayRef.current;
    const pose = poseRef.current;
    if (!v || !c || !pose) return;
    const work = document.createElement("canvas");
    const wctx = work.getContext("2d");
    const octx = c.getContext("2d");
    if (!wctx || !octx) return;

    let sImage: PosePoint[] | null = null; // puntos suavizados
    let sWorld: PosePoint[] | null = null;
    let lastTs = 0;
    let emitAt = 0;
    let statAt = 0;
    let raf = 0;
    const blend = (prev: PosePoint[] | null, next: PosePoint[]) =>
      prev
        ? prev.map((p, i) => ({
            x: p.x + (next[i].x - p.x) * SMOOTH,
            y: p.y + (next[i].y - p.y) * SMOOTH,
            z: p.z + (next[i].z - p.z) * SMOOTH,
            visibility: (p.visibility ?? 0) + ((next[i].visibility ?? 0) - (p.visibility ?? 0)) * SMOOTH,
          }))
        : next.map((p) => ({ ...p }));

    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (v.readyState < 2 || !v.videoWidth) return;
      const aspect = v.videoWidth / v.videoHeight;
      const ww = Math.round(WORK_H * aspect);
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

      let image: PosePoint[] | undefined;
      let world: PosePoint[] | undefined;
      try {
        const res = pose.detectForVideo(work, ts);
        image = res.landmarks[0];
        world = res.worldLandmarks[0];
      } catch {
        // un fotograma fallido no detiene el seguimiento
      }
      if (image && world) {
        sImage = blend(sImage, image);
        sWorld = blend(sWorld, world);

        // Esqueleto sobre el video (en espejo). El video llena el recuadro recortando lo que sobra.
        const fit = Math.max(cw / v.videoWidth, ch / v.videoHeight);
        const vw = v.videoWidth * fit;
        const vh = v.videoHeight * fit;
        const ox = (cw - vw) / 2;
        const oy = (ch - vh) / 2;
        const X = (k: number) => ox + (1 - sImage![k].x) * vw;
        const Y = (k: number) => oy + sImage![k].y * vh;
        octx.lineCap = "round";
        octx.strokeStyle = "#38bdf8";
        octx.shadowColor = "#38bdf8";
        octx.shadowBlur = 8;
        octx.lineWidth = 2.5;
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
          octx.arc(X(k), Y(k), 3, 0, Math.PI * 2);
          octx.fill();
        }

        if (t - emitAt > EMIT_MS) {
          emitAt = t;
          // Inclinación tal como se ve en pantalla (espejo): hombro derecho de la pantalla más bajo = roll positivo.
          const l = sImage[11];
          const r = sImage[12];
          const roll = Math.atan2((l.y - r.y) / aspect, Math.max(0.02, Math.abs(l.x - r.x)));
          const yaw = Math.atan2(sWorld[11].z - sWorld[12].z, Math.max(0.05, Math.abs(sWorld[11].x - sWorld[12].x)));
          frameRef.current(scanFromPose(sImage, sWorld, crewId, aspect), { roll, yaw });
        }
      }
      if (t - statAt > 300) {
        statAt = t;
        setSeen(Boolean(image));
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [stage, crewId]);

  const on = stage === "on";
  const message =
    stage === "asking" ? "Esperando permiso de la cámara…"
      : stage === "loading" ? "Cargando el seguimiento…"
        : stage === "denied" ? "Sin permiso para la cámara"
          : stage === "unavailable" ? "No se encontró una cámara"
            : stage === "error" ? "No se pudo cargar el seguimiento"
              : "";

  return (
    <div className="relative size-full overflow-hidden rounded-xl border border-primary/50 bg-black shadow-[0_10px_40px_-10px_rgb(0_0_0/0.9)]">
      <video ref={videoRef} muted playsInline className={cn("absolute inset-0 size-full -scale-x-100 object-cover", !on && "opacity-0")} />
      <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 size-full" />
      {!on && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-3 text-center">
          {(stage === "asking" || stage === "loading") && <Loader2 className="size-6 animate-spin text-primary" />}
          <p className="text-xs font-semibold">{message}</p>
        </div>
      )}
      <span className="absolute top-2 left-2 flex items-center gap-1.5 rounded-md bg-black/65 px-2 py-1 text-[11px] font-semibold backdrop-blur">
        <span className={cn("size-2 rounded-full", on && seen ? "animate-pulse bg-critico" : "bg-muted")} />
        {on ? (seen ? "En vivo" : "Buscando a la persona…") : "Cámara"}
      </span>
      <button type="button" onClick={onClose} title="Apagar la cámara" className="absolute top-1.5 right-1.5 rounded-md bg-black/65 p-1.5 text-fg backdrop-blur transition-colors hover:bg-black/85">
        <X className="size-3.5" />
      </button>
    </div>
  );
}
