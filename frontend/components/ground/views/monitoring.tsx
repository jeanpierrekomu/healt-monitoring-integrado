"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { TimeChart } from "@/components/ground/charts";
import { PageTitle } from "@/components/ground/shell";
import { DataView, Empty, FilterBar, Panel, ProvenanceTag, SelectFilter, Tag } from "@/components/ground/ui";
import { asList, fmtDate, fmtNum, provenanceOf, type Provenance } from "@/lib/ground/labels";
import { useData } from "@/lib/ground/use-data";
import { getAstronauts, getCrewOfMission, getMissions } from "@/lib/queries/catalog";
import { getLatestTelemetryTime, getTelemetry, TELEMETRY_LIMIT } from "@/lib/queries/telemetry";
import type { TelemetryRecord } from "@/types/database";

type NumKey = "heart_rate" | "spo2" | "body_temperature" | "respiratory_rate" | "systolic_pressure" | "diastolic_pressure"
  | "acceleration_x" | "acceleration_y" | "acceleration_z" | "gyroscope_x" | "gyroscope_y" | "gyroscope_z";

const MAIN: { key: NumKey; label: string; unit: string; color: string; dec: number }[] = [
  { key: "heart_rate", label: "Frecuencia cardíaca", unit: "lpm", color: "#f87171", dec: 0 },
  { key: "spo2", label: "SpO₂", unit: "%", color: "#22d3ee", dec: 1 },
  { key: "body_temperature", label: "Temperatura corporal", unit: "°C", color: "#fbbf24", dec: 1 },
  { key: "respiratory_rate", label: "Frecuencia respiratoria", unit: "rpm", color: "#34d399", dec: 0 },
];
const RANGES = [
  { value: "1", label: "1 h" },
  { value: "6", label: "6 h" },
  { value: "24", label: "24 h" },
  { value: "168", label: "7 días" },
  { value: "custom", label: "Personalizado" },
];

const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};
const lastValue = (list: TelemetryRecord[], key: NumKey) => {
  for (let i = list.length - 1; i >= 0; i--) {
    const v = list[i][key];
    if (v !== null && v !== undefined) return { v, at: list[i].recorded_at };
  }
  return null;
};

export function MonitoringView() {
  const params = useSearchParams();
  const missions = useData("ground:missions", getMissions);
  const astronauts = useData("ground:astronauts", getAstronauts);
  const [missionId, setMissionId] = useState("");
  const [astronautId, setAstronautId] = useState(params.get("astronaut") ?? "");
  const crew = useData(missionId ? `ground:crew:${missionId}` : null, () => getCrewOfMission(missionId));
  const [range, setRange] = useState("24");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const people = useMemo(() => {
    const all = astronauts.data ?? [];
    if (!missionId || !crew.data) return all;
    const ids = new Set(crew.data.map((c) => c.astronaut_id));
    return all.filter((a) => ids.has(a.id));
  }, [astronauts.data, crew.data, missionId]);

  // El intervalo se calcula desde el último registro disponible (no desde hoy): así siempre hay algo que ver.
  const latest = useData(astronautId || missionId ? `ground:latest:${missionId}:${astronautId}` : null, () => getLatestTelemetryTime({ missionId: missionId || undefined, astronautId: astronautId || undefined }));
  useEffect(() => {
    if (range === "custom" || !latest.data) return;
    const end = new Date(latest.data);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- el intervalo depende del último registro leído
    setTo(toLocalInput(end.toISOString()));
    setFrom(toLocalInput(new Date(end.getTime() - Number(range) * 3_600_000).toISOString()));
  }, [latest.data, range]);

  const ready = Boolean((astronautId || missionId) && from && to);
  const fromIso = from ? new Date(from).toISOString() : "";
  const toIso = to ? new Date(to).toISOString() : "";
  const telemetry = useData(ready ? `ground:telemetry:${missionId}:${astronautId}:${fromIso}:${toIso}` : null, () =>
    getTelemetry({ missionId: missionId || undefined, astronautId: astronautId || undefined, from: fromIso, to: toIso }),
  );

  return (
    <>
      <PageTitle title="Monitorización" subtitle="Registros de telemetría por misión y astronauta." />
      <FilterBar>
        <SelectFilter label="Misión" value={missionId} onChange={(v) => { setMissionId(v); setAstronautId(""); }} options={[{ value: "", label: "Todas" }, ...(missions.data ?? []).map((m) => ({ value: m.id, label: m.name ?? m.mission_code ?? m.id.slice(0, 8) }))]} />
        <SelectFilter label="Astronauta" value={astronautId} onChange={setAstronautId} options={[{ value: "", label: missionId ? "Toda la tripulación" : "Elegir…" }, ...people.map((a) => ({ value: a.id, label: a.full_name ?? a.id.slice(0, 8) }))]} />
        <SelectFilter label="Intervalo" value={range} onChange={setRange} options={RANGES} />
        {range === "custom" && (
          <>
            <label className="flex h-9 items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-[13px]">
              <span className="text-muted">Desde</span>
              <input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} className="bg-transparent outline-none [color-scheme:dark]" />
            </label>
            <label className="flex h-9 items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-[13px]">
              <span className="text-muted">Hasta</span>
              <input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} className="bg-transparent outline-none [color-scheme:dark]" />
            </label>
          </>
        )}
      </FilterBar>

      <div className="mt-4">
        {!astronautId && !missionId ? (
          <Empty title="Elige una misión o un astronauta" hint="La telemetría se carga solo para el intervalo elegido, sin descargar la tabla completa." />
        ) : latest.data === null && !latest.loading ? (
          <Empty title="Sin telemetría" hint="No hay registros de telemetría para esta selección." />
        ) : (
          <DataView state={telemetry} rows={6} empty={(d) => d.length === 0} emptyHint="No hay registros en este intervalo. Prueba con un intervalo más amplio.">
            {(list) => <Readings list={list} />}
          </DataView>
        )}
      </div>
    </>
  );
}

function Readings({ list }: { list: TelemetryRecord[] }) {
  const multiDay = list.length > 1 && (list[0].recorded_at ?? "").slice(0, 10) !== (list[list.length - 1].recorded_at ?? "").slice(0, 10);
  const t = (iso: string | null) => (iso ? new Date(iso).toLocaleString("es-PE", multiDay ? { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false } : { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }) : "");
  const data = list.map((r) => ({ t: t(r.recorded_at), ...Object.fromEntries((["heart_rate", "spo2", "body_temperature", "respiratory_rate", "systolic_pressure", "diastolic_pressure", "acceleration_x", "acceleration_y", "acceleration_z", "gyroscope_x", "gyroscope_y", "gyroscope_z"] as NumKey[]).map((k) => [k, r[k] ?? null])) }));
  const prov = new Map<Provenance, number>();
  for (const r of list) prov.set(provenanceOf(r.source_type), (prov.get(provenanceOf(r.source_type)) ?? 0) + 1);
  const quality = new Map<string, number>();
  for (const r of list) {
    const k = r.signal_quality === null || r.signal_quality === undefined ? "Sin dato" : String(r.signal_quality);
    quality.set(k, (quality.get(k) ?? 0) + 1);
  }
  const flagged = list.filter((r) => asList(r.quality_flags).length > 0).length;
  const activity = new Map<string, number>();
  for (const r of list) if (r.activity_state) activity.set(r.activity_state, (activity.get(r.activity_state) ?? 0) + 1);
  const missing = (k: NumKey) => list.filter((r) => r[k] === null || r[k] === undefined).length;
  const lastBp = { sys: lastValue(list, "systolic_pressure"), dia: lastValue(list, "diastolic_pressure") };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <span>{list.length} registros · {fmtDate(list[0].recorded_at, true)} → {fmtDate(list[list.length - 1].recorded_at, true)}</span>
        {list.length >= TELEMETRY_LIMIT && <Tag tone="yellow">Se muestran los primeros {TELEMETRY_LIMIT}; acota el intervalo</Tag>}
        {[...prov].map(([p, n]) => (
          <span key={p} className="flex items-center gap-1"><ProvenanceTag value={p} /> {n}</span>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        {MAIN.map((m) => {
          const lv = lastValue(list, m.key);
          return (
            <div key={m.key} className="rounded-lg border border-border bg-surface/80 px-4 py-3">
              <p className="text-[11px] font-semibold tracking-wider text-muted uppercase">{m.label}</p>
              <p className="mt-1.5 font-mono text-2xl font-bold tabular-nums" style={{ color: lv ? m.color : undefined }}>{fmtNum(lv?.v, m.unit, m.dec)}</p>
              <p className="mt-1 text-[11px] text-muted">{lv ? fmtDate(lv.at, true) : "Ningún valor en el intervalo"}</p>
            </div>
          );
        })}
        <div className="rounded-lg border border-border bg-surface/80 px-4 py-3">
          <p className="text-[11px] font-semibold tracking-wider text-muted uppercase">Presión arterial</p>
          <p className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-violet-300">
            {lastBp.sys || lastBp.dia ? `${lastBp.sys ? lastBp.sys.v.toFixed(0) : "—"}/${lastBp.dia ? lastBp.dia.v.toFixed(0) : "—"}` : "Sin dato"}
            {(lastBp.sys || lastBp.dia) && <span className="ml-1 text-sm text-muted">mmHg</span>}
          </p>
          <p className="mt-1 text-[11px] text-muted">{lastBp.sys ? fmtDate(lastBp.sys.at, true) : "Ningún valor en el intervalo"}</p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {MAIN.map((m) => (
          <Panel key={m.key} title={`${m.label} (${m.unit})`} right={missing(m.key) ? <Tag tone="gray">{missing(m.key)} sin dato</Tag> : undefined}>
            <TimeChart data={data} series={[{ key: m.key, label: m.label, color: m.color }]} unit={m.unit} />
          </Panel>
        ))}
        <Panel title="Presión arterial (mmHg)">
          <TimeChart data={data} series={[{ key: "systolic_pressure", label: "Sistólica", color: "#c4b5fd" }, { key: "diastolic_pressure", label: "Diastólica", color: "#818cf8" }]} unit="mmHg" />
        </Panel>
        <Panel title="Aceleración (m/s²)">
          <TimeChart data={data} series={[{ key: "acceleration_x", label: "X", color: "#f87171" }, { key: "acceleration_y", label: "Y", color: "#34d399" }, { key: "acceleration_z", label: "Z", color: "#60a5fa" }]} unit="m/s²" />
        </Panel>
        <Panel title="Giroscopio (°/s)">
          <TimeChart data={data} series={[{ key: "gyroscope_x", label: "X", color: "#f87171" }, { key: "gyroscope_y", label: "Y", color: "#34d399" }, { key: "gyroscope_z", label: "Z", color: "#60a5fa" }]} unit="°/s" />
        </Panel>
        <Panel title="Actividad física y calidad de datos">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-[11px] font-semibold tracking-wider text-muted uppercase">Actividad</p>
              {activity.size === 0 ? <p className="mt-1 text-[13px] text-muted">Sin dato</p> : (
                <ul className="mt-1.5 flex flex-col gap-1 text-[13px]">
                  {[...activity].sort((a, b) => b[1] - a[1]).map(([k, n]) => (
                    <li key={k} className="flex justify-between gap-2"><span data-no-i18n>{k}</span><span className="font-mono text-muted">{Math.round((n / list.length) * 100)} %</span></li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="text-[11px] font-semibold tracking-wider text-muted uppercase">Calidad de señal</p>
              <ul className="mt-1.5 flex flex-col gap-1 text-[13px]">
                {[...quality].sort((a, b) => b[1] - a[1]).map(([k, n]) => (
                  <li key={k} className="flex justify-between gap-2"><span data-no-i18n={k !== "Sin dato" ? true : undefined}>{k}</span><span className="font-mono text-muted">{Math.round((n / list.length) * 100)} %</span></li>
                ))}
                <li className="flex justify-between gap-2 border-t border-border pt-1"><span>Con observaciones de calidad</span><span className="font-mono text-muted">{flagged}</span></li>
              </ul>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
