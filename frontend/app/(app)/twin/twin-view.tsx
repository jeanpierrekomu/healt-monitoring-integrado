"use client";

// Gemelo muscular 3D: muestra el último escaneo de cuerpo del astronauta (tabla `musculoskeletal_scans`),
// con sus indicadores de postura y el estado de cada grupo muscular. El botón "Iniciar reconstrucción
// profunda" deja un comando para la estación con cámara y la pantalla espera el escaneo nuevo.
import { Camera, Flame, Loader2, Orbit, RotateCw, ScanLine, ShieldCheck, ShieldAlert, Waypoints } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { PageHeader, Progress } from "@/components/ui/animated";
import { Button, Card, CardTitle, Pill, type PillTone } from "@/components/ui/primitives";
import { CameraScan, type Lean } from "@/components/twin/camera-scan";
import { cn } from "@/lib/utils";
import {
  DEFAULT_JOINTS, fetchLatestScan, fetchScanCount, GROUP_LABEL, LEVEL_COLOR, LEVEL_LABEL, muscleLevels, requestDeepScan,
  type MuscleGroup, type MuscleLevel, type MuscleScan,
} from "@/services/muscle-scan";
import { HAS_BACKEND } from "@/services/supabase";

const MuscleTwin = dynamic(() => import("@/components/three/muscle-twin"), {
  ssr: false,
  loading: () => <div className="skeleton size-full rounded-xl" />,
});

const POLL_MS = 2000; // cada 2 s se pregunta si llegó un escaneo nuevo
const WAIT_MS = 90_000; // tiempo máximo de espera tras pedir una reconstrucción
const GROUPS: MuscleGroup[] = ["neck", "chest", "abs", "back", "glutes", "legs"];
const LEVEL_TONE: Record<MuscleLevel, PillTone> = { optimal: "normal", moderate: "atencion", elevated: "critico" };

type Load = "loading" | "ready" | "error";
type Request = "idle" | "sending" | "waiting" | "timeout" | "failed";

function scoreTone(v: number): { label: string; tone: PillTone; bar: string } {
  if (v >= 90) return { label: "Postura simétrica", tone: "normal", bar: "bg-normal" };
  if (v >= 75) return { label: "Asimetría leve", tone: "atencion", bar: "bg-atencion" };
  return { label: "Asimetría marcada", tone: "advertencia", bar: "bg-advertencia" };
}
function ago(iso: string, now: number) {
  const min = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (min < 1) return "hace un momento";
  if (min < 60) return `hace ${min} min`;
  if (min < 1440) return `hace ${Math.round(min / 60)} h`;
  return `hace ${Math.round(min / 1440)} días`;
}

function Measure({ label, value, unit, hint }: { label: string; value: number | undefined; unit: string; hint: string }) {
  return (
    <div className="rounded-lg bg-surface-2 p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-0.5 font-mono text-xl font-bold tabular-nums">
        {value === undefined ? "—" : value.toFixed(value >= 10 ? 1 : 2)}
        <span className="ml-1 text-xs font-semibold text-muted">{unit}</span>
      </p>
      <p className="mt-0.5 text-[11px] text-muted">{hint}</p>
    </div>
  );
}

export function TwinView({ astronauts }: { astronauts: { id: string; name: string; role: string }[] }) {
  const [crewId, setCrewId] = useState(astronauts[0]?.id ?? "");
  const [scan, setScan] = useState<MuscleScan | null>(null);
  const [count, setCount] = useState(0);
  const [load, setLoad] = useState<Load>("loading");
  const [request, setRequest] = useState<Request>("idle");
  const [now, setNow] = useState(0);
  const [heat, setHeat] = useState(true);
  const [showJoints, setShowJoints] = useState(false);
  const [spin, setSpin] = useState(true);
  const [scanning, setScanning] = useState(false); // cámara de este equipo en vivo
  const [lean, setLean] = useState<Lean | null>(null);
  const [local, setLocal] = useState(false); // el escaneo mostrado se hizo aquí, no viene del backend
  const lastId = useRef(0);
  const askedAt = useRef(0);
  const person = astronauts.find((a) => a.id === crewId);

  // Carga el último escaneo del tripulante elegido y sigue preguntando cada 2 s por uno nuevo.
  useEffect(() => {
    if (!crewId || !HAS_BACKEND) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sin backend no hay nada que cargar
      setLoad("ready");
      return;
    }
    let stopped = false;
    lastId.current = 0;
    setScan(null);
    setLocal(false);
    setScanning(false);
    setLean(null);
    setLoad("loading");
    setRequest("idle");
    const pull = async (first: boolean) => {
      try {
        const latest = await fetchLatestScan(crewId);
        if (stopped) return;
        setNow(Date.now());
        if (latest && latest.id !== lastId.current) {
          lastId.current = latest.id;
          setScan(latest);
          setLocal(false);
          setCount(await fetchScanCount(crewId));
          // Si se estaba esperando una reconstrucción y llegó un escaneo posterior al pedido, ya está.
          if (!first && askedAt.current && new Date(latest.created_at).getTime() >= askedAt.current - 5000) {
            askedAt.current = 0;
            setRequest("idle");
          }
        } else if (askedAt.current && Date.now() - askedAt.current > WAIT_MS) {
          askedAt.current = 0;
          setRequest("timeout");
        }
        setLoad("ready");
      } catch {
        if (!stopped && first) setLoad("error");
      }
    };
    void pull(true);
    const id = setInterval(() => void pull(false), POLL_MS);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [crewId]);

  const start = useCallback(async () => {
    setRequest("sending");
    try {
      await requestDeepScan(crewId);
      askedAt.current = Date.now();
      setRequest("waiting");
    } catch {
      setRequest("failed");
    }
  }, [crewId]);

  // Cámara en vivo: cada escaneo armado en este equipo reemplaza al anterior y el modelo lo sigue.
  const onLiveFrame = useCallback((sc: MuscleScan, l: Lean) => {
    setScan(sc);
    setLean(l);
    setLocal(true);
    setNow(Date.now());
  }, []);
  const stopLive = useCallback(() => {
    setScanning(false);
    setLean(null);
  }, []);

  const m = scan?.biomechanical_metrics;
  const levels = muscleLevels(scan);
  const score = scan?.posture_symmetry_score;
  const st = score !== undefined ? scoreTone(score) : null;
  const busy = request === "sending" || request === "waiting";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Gemelo muscular 3D"
        subtitle="Reconstrucción del cuerpo del astronauta a partir del escaneo con cámara: postura, proporciones y carga muscular."
        actions={
          <>
          <Button variant="secondary" onClick={() => (scanning ? stopLive() : setScanning(true))} disabled={!crewId}>
            <Camera className="size-4" /> {scanning ? "Apagar cámara" : "Cámara en vivo"}
          </Button>
          <Button onClick={start} disabled={busy || !HAS_BACKEND || !crewId}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <ScanLine className="size-4" />}
            {request === "sending" ? "Enviando…" : request === "waiting" ? "Esperando a la estación…" : "Iniciar reconstrucción profunda"}
          </Button>
          </>
        }
      />

      {request === "waiting" && (
        <p className="rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 text-[13px]">
          Se pidió un escaneo nuevo de <span className="font-semibold">{person?.name}</span>. La estación con cámara lo procesa y el modelo se actualiza solo cuando llegue.
        </p>
      )}
      {request === "timeout" && (
        <p className="rounded-xl border border-atencion/40 bg-atencion/10 px-4 py-3 text-[13px]">
          La estación con cámara no respondió en 90 segundos. Revisa que esté encendida y vuelve a intentarlo.
        </p>
      )}
      {request === "failed" && (
        <p className="rounded-xl border border-critico/40 bg-critico/10 px-4 py-3 text-[13px]">No se pudo enviar el pedido al backend. Inténtalo de nuevo.</p>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="p-3">
          <div className="relative h-[560px] overflow-hidden rounded-xl bg-[radial-gradient(ellipse_at_center,#12203a_0%,#070b14_70%)]">
            <MuscleTwin
              joints={scan?.skeleton_3d_joints ?? DEFAULT_JOINTS}
              proportions={m?.anatomical_proportions}
              levels={levels}
              heat={heat && !!scan}
              showJoints={showJoints}
              spin={spin && !scanning}
              lean={scanning ? lean : null}
            />
            <div className="pointer-events-none absolute top-4 left-4 flex flex-col gap-1.5">
              <span className="rounded-md bg-black/55 px-2 py-1 font-mono text-[11px] text-fg backdrop-blur">{person?.name ?? "—"}</span>
              <span className={cn("rounded-md px-2 py-1 text-[11px] font-semibold backdrop-blur", !scan ? "bg-black/55 text-muted" : local ? "bg-primary/20 text-primary" : "bg-normal/20 text-normal")}>
                {load === "loading"
                  ? "Cargando escaneo…"
                  : !scan
                    ? "Sin escaneos: figura de referencia"
                    : scanning
                      ? "En vivo · cámara de este equipo"
                      : local
                        ? `Captura de la cámara · ${ago(scan.created_at, now)}`
                      : `Escaneo real · ${ago(scan.created_at, now)}`}
              </span>
            </div>
            {heat && scan && (
              <div className="pointer-events-none absolute bottom-4 left-4 flex items-center gap-3 rounded-md bg-black/55 px-2.5 py-1.5 text-[11px] backdrop-blur">
                {(["optimal", "moderate", "elevated"] as const).map((l) => (
                  <span key={l} className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: LEVEL_COLOR[l] }} /> {LEVEL_LABEL[l]}
                  </span>
                ))}
              </div>
            )}
            {scanning ? (
              <div className="absolute right-4 bottom-4 h-[190px] w-[300px] max-w-[45%]">
                <CameraScan crewId={crewId} onFrame={onLiveFrame} onClose={stopLive} />
              </div>
            ) : (
              <p className="pointer-events-none absolute right-4 bottom-4 text-[11px] text-muted">Arrastra para girar · rueda para acercar</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 px-2 pt-3 pb-1 text-[13px]">
            <label className="mr-2 flex items-center gap-2">
              <span className="text-muted">Astronauta:</span>
              <select
                value={crewId}
                onChange={(e) => setCrewId(e.target.value)}
                className="cursor-pointer rounded-lg border border-border bg-surface px-2.5 py-1.5 font-semibold outline-none focus:border-primary/60"
              >
                {astronauts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </label>
            {[
              { on: heat, set: setHeat, icon: Flame, label: "Carga muscular" },
              { on: showJoints, set: setShowJoints, icon: Waypoints, label: "Esqueleto escaneado" },
              { on: spin, set: setSpin, icon: spin ? Orbit : RotateCw, label: "Giro automático" },
            ].map(({ on, set, icon: Icon, label }) => (
              <button
                key={label}
                type="button"
                aria-pressed={on}
                onClick={() => set(!on)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors",
                  on ? "border-primary/50 bg-primary/10 text-primary" : "border-border text-muted hover:text-fg",
                )}
              >
                <Icon className="size-3.5" /> {label}
              </button>
            ))}
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardTitle
              title="Simetría postural"
              subtitle={!scan ? undefined : local ? "Estimado en este equipo con la cámara" : `${count} ${count === 1 ? "escaneo guardado" : "escaneos guardados"}`}
              right={st ? <Pill tone={st.tone}>{st.label}</Pill> : undefined}
            />
            <p className="font-mono text-5xl font-bold tabular-nums">
              {score !== undefined ? score.toFixed(1) : "—"}
              <span className="ml-1.5 text-lg text-muted">/ 100</span>
            </p>
            <div className="mt-3">
              <Progress value={score ?? 0} barClassName={st?.bar ?? "bg-primary"} />
            </div>
            {scan && (
              <p className={cn("mt-3 flex items-center gap-1.5 text-xs", scan.blue_suit_verified ? "text-normal" : "text-atencion")}>
                {scan.blue_suit_verified ? <ShieldCheck className="size-4" /> : <ShieldAlert className="size-4" />}
                {scan.blue_suit_verified ? "Calibrado con traje azul ajustado" : local ? "Simulación con la cámara: no se guarda en el backend" : "Sin calibrar con el traje: medidas menos fiables"}
              </p>
            )}
            {!scan && load !== "loading" && (
              <p className="mt-3 text-[13px] text-muted">
                {`${person?.name ?? "Este tripulante"} todavía no tiene escaneos. Pulsa "Cámara en vivo" para verlo aquí mismo.`}
              </p>
            )}
          </Card>

          <Card>
            <CardTitle title="Alineación" subtitle="Cuanto más cerca de cero, mejor" />
            <div className="grid grid-cols-2 gap-3">
              <Measure label="Inclinación de hombros" value={m?.shoulder_tilt_deg} unit="°" hint="un hombro más alto" />
              <Measure label="Inclinación de pelvis" value={m?.pelvic_tilt_deg} unit="°" hint="una cadera más alta" />
              <Measure label="Desviación de columna" value={m?.spinal_lateral_deviation_pct} unit="%" hint="hacia un lado" />
              <Measure label="Hombros / torso" value={m?.shoulder_to_torso_ratio} unit="" hint="ancho relativo" />
            </div>
          </Card>

          <Card>
            <CardTitle title="Grupos musculares" subtitle="Nivel de tensión o carga" />
            <ul className="flex flex-col gap-2 text-[13px]">
              {GROUPS.map((g) => {
                const l = levels[g];
                return (
                  <li key={g} className="flex items-center justify-between gap-3 rounded-lg bg-surface-2 px-3 py-2">
                    <span>{GROUP_LABEL[g]}</span>
                    {l ? <Pill tone={LEVEL_TONE[l]}>{LEVEL_LABEL[l]}</Pill> : <span className="text-xs text-muted">Sin dato</span>}
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-xs text-muted">En el modelo, una zona con carga se enciende en naranja o amarillo. El escaneo no mide la carga de los brazos.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
