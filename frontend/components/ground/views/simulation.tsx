"use client";

import { Pause, Play, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TimeChart } from "@/components/ground/charts";
import { PageTitle } from "@/components/ground/shell";
import { Empty, Field, LevelTag, Panel, SelectFilter, SimulatedTag, Tag } from "@/components/ground/ui";
import { fmtDate } from "@/lib/ground/labels";
import {
  activityOf, DEFAULT_RANGES, DEMO_CATALOG, EFFECT_LABEL, effectOf, levelOf, seedOf, Simulator,
  type CrewMember, type Effect, type Ranges, type Scheduled, type SimEvent, type Vitals,
} from "@/lib/ground/sim";
import { useData } from "@/lib/ground/use-data";
import { getAstronauts, getCrewOfMission, getMissions } from "@/lib/queries/catalog";
import { getScenarios, getSessionBaselines, getSessions, getSessionScenarios } from "@/lib/queries/simulation";
import type { HealthBaseline } from "@/types/database";

const SAMPLE_EVERY = 5; // segundos simulados entre puntos del gráfico
const KEEP = 720; // puntos por tripulante (1 hora simulada)
const SPEEDS = [1, 10, 30, 60];

type Point = { t: string; sec: number; hr: number; spo2: number; temp: number; resp: number; sys: number; dia: number };
const clock = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const point = (sec: number, v: Vitals): Point => ({
  t: clock(sec), sec, hr: Math.round(v.hr), spo2: Math.round(v.spo2 * 10) / 10, temp: Math.round(v.temp * 100) / 100,
  resp: Math.round(v.resp), sys: Math.round(v.sys), dia: Math.round(v.dia),
});

function rangesFrom(b: HealthBaseline | undefined): Ranges {
  if (!b) return DEFAULT_RANGES;
  const pair = (lo: number | null, hi: number | null, d: [number, number]): [number, number] => [lo ?? d[0], hi ?? d[1]];
  return {
    hr: pair(b.heart_rate_min, b.heart_rate_max, DEFAULT_RANGES.hr),
    spo2: pair(b.spo2_min, b.spo2_max, DEFAULT_RANGES.spo2),
    temp: pair(b.temperature_min, b.temperature_max, DEFAULT_RANGES.temp),
    resp: pair(b.respiratory_rate_min, b.respiratory_rate_max, DEFAULT_RANGES.resp),
  };
}

const DEMO_CREW: CrewMember[] = [
  { id: "demo-a", name: "Tripulante A", ranges: DEFAULT_RANGES },
  { id: "demo-b", name: "Tripulante B", ranges: DEFAULT_RANGES },
  { id: "demo-c", name: "Tripulante C", ranges: DEFAULT_RANGES },
];

export function SimulationView() {
  const params = useSearchParams();
  const missions = useData("ground:missions", getMissions);
  const astronauts = useData("ground:astronauts", getAstronauts);
  const scenarios = useData("ground:scenarios", getScenarios);
  const [missionId, setMissionId] = useState(params.get("mission") ?? "");
  const [sessionId, setSessionId] = useState("");
  const sessions = useData(missionId ? `ground:sessions:${missionId}` : null, () => getSessions(missionId));
  const crewRows = useData(missionId ? `ground:crew:${missionId}` : null, () => getCrewOfMission(missionId));
  const planned = useData(sessionId ? `ground:session-scenarios:${sessionId}` : null, () => getSessionScenarios(sessionId));
  const baselines = useData(sessionId ? `ground:session-baselines:${sessionId}` : null, () => getSessionBaselines(sessionId));
  const session = sessions.data?.find((s) => s.id === sessionId);

  const [seedText, setSeedText] = useState("42");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- la semilla de la sesión elegida
    if (session) setSeedText(String(session.random_seed ?? 42));
  }, [session]);

  // Tripulación: la de la misión (con sus rangos de referencia) o una de demostración.
  const crew: CrewMember[] = useMemo(() => {
    const rows = crewRows.data ?? [];
    const people = rows.map((c) => astronauts.data?.find((a) => a.id === c.astronaut_id)).filter((a): a is NonNullable<typeof a> => Boolean(a));
    if (!people.length) return DEMO_CREW;
    return people.map((a) => ({ id: a.id, name: a.full_name ?? a.id.slice(0, 8), ranges: rangesFrom(baselines.data?.find((b) => b.astronaut_id === a.id)) }));
  }, [crewRows.data, astronauts.data, baselines.data]);
  const demoCrew = crew === DEMO_CREW;

  // Catálogo de escenarios: los de la base, o los de demostración si la base aún no tiene.
  const catalog = useMemo(() => {
    const db = (scenarios.data ?? []).filter((s) => s.is_active !== false);
    if (db.length) return { fromDb: true, items: db.map((s) => ({ key: s.id, name: s.name ?? s.scenario_code ?? "Escenario", effect: effectOf(`${s.scenario_code ?? ""} ${s.name ?? ""} ${s.category ?? ""} ${s.description ?? ""}`) })) };
    return { fromDb: false, items: DEMO_CATALOG.map((d) => ({ key: d.code, name: d.name, effect: d.effect })) };
  }, [scenarios.data]);

  // Escenarios programados en la base para la sesión elegida.
  const dbPlan: Scheduled[] = useMemo(
    () =>
      (planned.data ?? []).map((p) => {
        const sc = scenarios.data?.find((s) => s.id === p.scenario_id);
        const name = sc?.name ?? sc?.scenario_code ?? "Escenario";
        return { id: p.id, name, effect: effectOf(`${sc?.scenario_code ?? ""} ${name} ${sc?.category ?? ""}`), start: p.start_offset_seconds ?? 0, duration: p.duration_seconds ?? 300, astronautId: p.astronaut_id, fromDb: true };
      }),
    [planned.data, scenarios.data],
  );
  const [localPlan, setLocalPlan] = useState<Scheduled[] | null>(null);
  const defaultPlan: Scheduled[] = useMemo(() => {
    const pick = (effect: Effect, i: number) => catalog.items.find((x) => x.effect === effect) ?? catalog.items[i % catalog.items.length];
    const slots: [Effect, number, number, number][] = [["exertion", 120, 360, 0], ["hypoxia", 420, 300, 1], ["fever", 660, 600, 2]];
    return slots.map(([effect, start, duration, who], i) => {
      const it = pick(effect, i);
      return { id: `local-default-${i}`, name: it.name, effect: it.effect, start, duration, astronautId: crew[who % crew.length]?.id ?? null, fromDb: false };
    });
  }, [catalog, crew]);
  const schedule = useMemo(() => [...dbPlan, ...(localPlan ?? (dbPlan.length ? [] : defaultPlan))], [dbPlan, localPlan, defaultPlan]);
  const duration = Math.max(600, Math.ceil((Math.max(0, ...schedule.map((s) => s.start + s.duration)) + 120) / 60) * 60);
  const seed = seedOf(seedText);

  // Estado de la ejecución.
  const simRef = useRef<Simulator | null>(null);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(30);
  const [simT, setSimT] = useState(0);
  const [now, setNow] = useState<Record<string, Vitals>>({});
  const [history, setHistory] = useState<Record<string, Point[]>>({});
  const [events, setEvents] = useState<SimEvent[]>([]);
  const [selected, setSelected] = useState("");
  const sel = crew.find((m) => m.id === selected) ?? crew[0];

  const reset = useCallback(() => {
    const sim = new Simulator(crew, schedule, seed);
    simRef.current = sim;
    const snap = sim.snapshot();
    setRunning(false);
    setSimT(0);
    setEvents([]);
    setNow(snap);
    setHistory(Object.fromEntries(crew.map((m) => [m.id, [point(0, snap[m.id])]])));
  }, [crew, schedule, seed]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- al cambiar la configuración se reinicia la simulación
    reset();
  }, [reset]);

  useEffect(() => {
    if (!running) return;
    let acc = 0;
    const id = setInterval(() => {
      const sim = simRef.current;
      if (!sim) return;
      acc += speed / 4;
      const n = Math.floor(acc);
      acc -= n;
      const evs: SimEvent[] = [];
      const samples: Record<string, Point[]> = {};
      for (let i = 0; i < n && sim.t < duration; i++) {
        evs.push(...sim.step());
        if (sim.t % SAMPLE_EVERY === 0) {
          const snap = sim.snapshot();
          for (const m of crew) (samples[m.id] ??= []).push(point(sim.t, snap[m.id]));
        }
      }
      setSimT(sim.t);
      setNow(sim.snapshot());
      if (evs.length) setEvents((e) => [...e, ...evs].slice(-400));
      if (Object.keys(samples).length) {
        setHistory((h) => {
          const out = { ...h };
          for (const [k, pts] of Object.entries(samples)) out[k] = [...(h[k] ?? []), ...pts].slice(-KEEP);
          return out;
        });
      }
      if (sim.t >= duration) setRunning(false);
    }, 250);
    return () => clearInterval(id);
  }, [running, speed, duration, crew]);

  // Formulario para programar un escenario local.
  const [form, setForm] = useState({ item: "", who: "", start: 2, dur: 5 });
  const addLocal = () => {
    const it = catalog.items.find((x) => x.key === form.item) ?? catalog.items[0];
    if (!it) return;
    const item: Scheduled = { id: `local-${Date.now()}`, name: it.name, effect: it.effect, start: Math.max(0, form.start) * 60, duration: Math.max(1, form.dur) * 60, astronautId: form.who || null, fromDb: false };
    setLocalPlan((p) => [...(p ?? (dbPlan.length ? [] : defaultPlan)), item]);
  };
  const removeLocal = (id: string) => setLocalPlan((p) => (p ?? defaultPlan).filter((x) => x.id !== id));

  const alerts = events.filter((e) => e.kind === "alert");
  const critical = alerts.filter((e) => e.level === "critico").length;
  const who = (id: string | null) => (id ? (crew.find((m) => m.id === id)?.name ?? "—") : "Toda la tripulación");
  const done = simT >= duration;

  return (
    <>
      <PageTitle
        title="Simulación"
        subtitle="Ejecuta una simulación local de la misión. Los datos se generan en este navegador y no se guardan en Supabase."
        right={<span className="flex items-center gap-2"><SimulatedTag /><Tag tone="gray">Solo lectura</Tag></span>}
      />

      <Panel title="Configuración">
        <div className="flex flex-wrap items-center gap-2">
          <SelectFilter label="Misión" value={missionId} onChange={(v) => { setMissionId(v); setSessionId(""); setLocalPlan(null); }} options={[{ value: "", label: "Sin misión (demostración)" }, ...(missions.data ?? []).map((m) => ({ value: m.id, label: m.name ?? m.mission_code ?? m.id.slice(0, 8) }))]} />
          <SelectFilter label="Sesión" value={sessionId} onChange={(v) => { setSessionId(v); setLocalPlan(null); }} options={[{ value: "", label: "Sesión local nueva" }, ...(sessions.data ?? []).map((s) => ({ value: s.id, label: `${s.id.slice(0, 8)} · ${fmtDate(s.started_at)}` }))]} />
          <label className="flex h-9 items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-[13px]" title="Con la misma semilla y los mismos escenarios, la simulación da siempre el mismo resultado">
            <span className="text-muted">Semilla:</span>
            <input value={seedText} onChange={(e) => setSeedText(e.target.value)} className="w-24 bg-transparent font-mono font-semibold outline-none" />
          </label>
          <SelectFilter label="Velocidad" value={String(speed)} onChange={(v) => setSpeed(Number(v))} options={SPEEDS.map((s) => ({ value: String(s), label: `×${s}` }))} />
          <span className="ml-auto flex gap-2">
            <button type="button" onClick={() => (done ? (reset(), setRunning(true)) : setRunning(!running))} className="flex h-9 items-center gap-1.5 rounded-md bg-cyan-400 px-3 text-[13px] font-bold text-black hover:bg-cyan-300">
              {running ? <Pause className="size-4" /> : <Play className="size-4" />} {running ? "Pausar" : done ? "Repetir" : simT > 0 ? "Continuar" : "Iniciar"}
            </button>
            <button type="button" onClick={reset} className="flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-[13px] font-semibold text-muted hover:text-fg">
              <RotateCcw className="size-4" /> Reiniciar
            </button>
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
          {demoCrew && <Tag tone="violet">Tripulación de demostración</Tag>}
          {!catalog.fromDb && <Tag tone="violet">Escenarios de demostración (la base aún no tiene escenarios)</Tag>}
          {session && <span>Sesión de la base · estado <span data-no-i18n>{session.session_status ?? "—"}</span> · los resultados guardados no se modifican</span>}
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between font-mono text-xs text-muted">
            <span>{clock(simT)} / {clock(duration)}</span>
            <span>{Math.round((simT / duration) * 100)} %</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-cyan-400 transition-[width] duration-200" style={{ width: `${(simT / duration) * 100}%` }} />
          </div>
        </div>
      </Panel>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-4">
          <Panel title="Escenarios programados" subtitle="Cada barra es un escenario; la línea marca el momento actual de la simulación">
            {schedule.length === 0 ? (
              <Empty title="Sin escenarios" hint="Agrega uno abajo para que la simulación tenga eventos." />
            ) : (
              <div className="relative flex flex-col gap-1.5">
                {schedule.map((s) => (
                  <div key={s.id} className="grid grid-cols-[160px_minmax(0,1fr)_28px] items-center gap-2 text-xs">
                    <span className="truncate" title={`${s.name} · ${who(s.astronautId)}`}>
                      <span className="font-semibold" data-no-i18n={s.fromDb || catalog.fromDb ? true : undefined}>{s.name}</span>
                      <span className="block truncate text-muted" data-no-i18n={!demoCrew && s.astronautId ? true : undefined}>{who(s.astronautId)}</span>
                    </span>
                    <span className="relative h-5 rounded bg-surface-2">
                      <span className={`absolute inset-y-0 rounded ${s.fromDb ? "bg-cyan-400/50" : "bg-violet-400/50"}`} style={{ left: `${(s.start / duration) * 100}%`, width: `${(s.duration / duration) * 100}%` }} title={EFFECT_LABEL[s.effect]} />
                    </span>
                    {s.fromDb ? <span title="Programado en la base" className="text-center text-cyan-300">●</span> : (
                      <button type="button" onClick={() => removeLocal(s.id)} className="text-muted hover:text-critico" aria-label="Quitar escenario"><Trash2 className="size-3.5" /></button>
                    )}
                  </div>
                ))}
                <span className="pointer-events-none absolute inset-y-0 w-px bg-cyan-300" style={{ left: `calc(168px + (100% - 204px) * ${simT / duration})` }} />
              </div>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3 text-[13px]">
              <SelectFilter label="Escenario" value={form.item || catalog.items[0]?.key || ""} onChange={(v) => setForm({ ...form, item: v })} options={catalog.items.map((x) => ({ value: x.key, label: x.name }))} />
              <SelectFilter label="Para" value={form.who} onChange={(v) => setForm({ ...form, who: v })} options={[{ value: "", label: "Toda la tripulación" }, ...crew.map((m) => ({ value: m.id, label: m.name }))]} />
              <label className="flex h-9 items-center gap-1.5 rounded-md border border-border bg-surface px-2.5"><span className="text-muted">Inicio (min)</span><input type="number" min={0} value={form.start} onChange={(e) => setForm({ ...form, start: Number(e.target.value) })} className="w-14 bg-transparent font-mono outline-none" /></label>
              <label className="flex h-9 items-center gap-1.5 rounded-md border border-border bg-surface px-2.5"><span className="text-muted">Duración (min)</span><input type="number" min={1} value={form.dur} onChange={(e) => setForm({ ...form, dur: Number(e.target.value) })} className="w-14 bg-transparent font-mono outline-none" /></label>
              <button type="button" onClick={addLocal} className="flex h-9 items-center gap-1.5 rounded-md border border-violet-400/50 bg-violet-400/10 px-3 font-semibold text-violet-300 hover:bg-violet-400/20"><Plus className="size-4" /> Agregar</button>
            </div>
          </Panel>

          <Panel title="Tripulación en la simulación" right={<SimulatedTag />}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead className="text-[11px] tracking-wider text-muted uppercase">
                  <tr>{["Tripulante", "FC (lpm)", "SpO₂ (%)", "Temp. (°C)", "FR (rpm)", "PA (mmHg)", "Actividad"].map((h) => <th key={h} className="px-2 py-2 font-semibold whitespace-nowrap">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {crew.map((m) => {
                    const v = now[m.id];
                    if (!v) return null;
                    const cell = (key: "hr" | "spo2" | "temp" | "resp" | "sys", text: string) => {
                      const lv = levelOf(key, v[key], m.ranges);
                      return <td className={`px-2 py-2 font-mono tabular-nums ${lv === "critico" ? "text-critico" : lv === "advertencia" ? "text-atencion" : ""}`}>{text}</td>;
                    };
                    return (
                      <tr key={m.id} onClick={() => setSelected(m.id)} className={`cursor-pointer border-t border-border hover:bg-surface/60 ${sel?.id === m.id ? "bg-cyan-400/5" : ""}`}>
                        <td className="px-2 py-2 font-semibold" data-no-i18n={demoCrew ? undefined : true}>{m.name}</td>
                        {cell("hr", v.hr.toFixed(0))}
                        {cell("spo2", v.spo2.toFixed(1))}
                        {cell("temp", v.temp.toFixed(1))}
                        {cell("resp", v.resp.toFixed(0))}
                        {cell("sys", `${v.sys.toFixed(0)}/${v.dia.toFixed(0)}`)}
                        <td className="px-2 py-2 text-xs text-muted">{activityOf(v.accel)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-muted">Toca un tripulante para ver sus gráficos.</p>
          </Panel>

          {sel && (
            <div className="grid gap-4 lg:grid-cols-2">
              {[
                { key: "hr", label: "Frecuencia cardíaca", unit: "lpm", color: "#f87171" },
                { key: "spo2", label: "SpO₂", unit: "%", color: "#22d3ee" },
                { key: "temp", label: "Temperatura corporal", unit: "°C", color: "#fbbf24" },
                { key: "resp", label: "Frecuencia respiratoria", unit: "rpm", color: "#34d399" },
              ].map((c) => (
                <Panel key={c.key} title={<>{c.label} ({c.unit})</>} subtitle={<span data-no-i18n={demoCrew ? undefined : true}>{sel.name}</span>} right={<SimulatedTag />}>
                  <TimeChart data={history[sel.id] ?? []} series={[{ key: c.key, label: c.label, color: c.color }]} unit={c.unit} height={150} />
                </Panel>
              ))}
              <Panel title="Presión arterial (mmHg)" subtitle={<span data-no-i18n={demoCrew ? undefined : true}>{sel.name}</span>} right={<SimulatedTag />} className="lg:col-span-2">
                <TimeChart data={history[sel.id] ?? []} series={[{ key: "sys", label: "Sistólica", color: "#c4b5fd" }, { key: "dia", label: "Diastólica", color: "#818cf8" }]} unit="mmHg" height={150} />
              </Panel>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-surface/80 px-4 py-3">
              <p className="text-[11px] font-semibold tracking-wider text-muted uppercase">Alertas generadas</p>
              <p className="mt-1.5 font-mono text-2xl font-bold">{alerts.length}</p>
            </div>
            <div className="rounded-lg border border-border bg-surface/80 px-4 py-3">
              <p className="text-[11px] font-semibold tracking-wider text-muted uppercase">Críticas</p>
              <p className={`mt-1.5 font-mono text-2xl font-bold ${critical ? "text-critico" : ""}`}>{critical}</p>
            </div>
          </div>
          <Panel title="Eventos y alertas" subtitle="Generados durante la ejecución" right={<SimulatedTag />}>
            {events.length === 0 ? (
              <p className="text-[13px] text-muted">{simT === 0 ? "Inicia la simulación para ver los eventos." : "Sin eventos por ahora."}</p>
            ) : (
              <ol className="flex max-h-[560px] flex-col gap-1.5 overflow-y-auto pr-1">
                {[...events].reverse().map((e, i) => (
                  <li key={`${e.t}-${i}`} className="rounded-md border border-border px-2.5 py-1.5 text-[13px]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs text-muted">{clock(e.t)}</span>
                      {e.kind === "alert" ? <LevelTag level={e.level} /> : e.kind === "recovered" ? <Tag tone="green">Recuperado</Tag> : <Tag tone={e.kind === "scenario-start" ? "violet" : "gray"}>{e.kind === "scenario-start" ? "Escenario" : "Fin"}</Tag>}
                    </div>
                    <p className="mt-0.5">{e.text}</p>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
          <Panel title="Cómo funciona">
            <dl className="grid gap-2.5">
              <Field label="Datos">Sintéticos, generados con un modelo fisiológico simple: los signos cambian de forma continua y relacionada.</Field>
              <Field label="Reproducible">Con la misma semilla y los mismos escenarios, el resultado es idéntico.</Field>
              <Field label="Alertas">Umbrales de ejemplo, no clínicos. No son diagnósticos.</Field>
            </dl>
          </Panel>
        </div>
      </div>
    </>
  );
}
