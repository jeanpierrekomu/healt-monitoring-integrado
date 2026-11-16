"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PageTitle } from "@/components/ground/shell";
import { DataView, Field, FilterBar, LevelTag, Pagination, Panel, ProvenanceTag, SelectFilter, Tag, usePageSlice } from "@/components/ground/ui";
import { alertStateOf, fmtDate, fmtNum, provenanceOf, severityOf, type AlertState, type Level } from "@/lib/ground/labels";
import { useData } from "@/lib/ground/use-data";
import { ALERTS_LIMIT, getAlerts, getEvidence, getInterventions, getSimulationEvent } from "@/lib/queries/alerts";
import { getAstronauts } from "@/lib/queries/catalog";
import { getTelemetryByIds } from "@/lib/queries/telemetry";
import type { Astronaut, HealthAlert } from "@/types/database";

const PAGE = 20;
const STATE: Record<AlertState, { label: string; tone: "yellow" | "cyan" | "gray" | "green" }> = {
  open: { label: "Abierta", tone: "yellow" },
  acknowledged: { label: "En revisión", tone: "cyan" },
  resolved: { label: "Resuelta", tone: "green" },
  unknown: { label: "Sin estado", tone: "gray" },
};

export function AlertsView() {
  const alerts = useData("ground:alerts", () => getAlerts());
  const astronauts = useData("ground:astronauts", getAstronauts);
  const [sev, setSev] = useState<"todas" | Level>("todas");
  const [st, setSt] = useState<"todos" | AlertState>("todos");
  const [who, setWho] = useState("");
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<HealthAlert | null>(null);
  const name = (id: string | null) => astronauts.data?.find((a) => a.id === id)?.full_name ?? "—";
  const list = (alerts.data ?? []).filter((a) => (sev === "todas" || severityOf(a.severity) === sev) && (st === "todos" || alertStateOf(a) === st) && (!who || a.astronaut_id === who));
  const { slice, pages, page: p } = usePageSlice(list, page, PAGE);
  const reset = () => setPage(0);

  return (
    <>
      <PageTitle title="Alertas e intervenciones" subtitle="Avisos generados a partir de la telemetría. No son diagnósticos ni decisiones clínicas: el equipo médico siempre confirma." />
      <FilterBar>
        <SelectFilter label="Severidad" value={sev} onChange={(v) => { setSev(v); reset(); }} options={[{ value: "todas", label: "Todas" }, { value: "critico", label: "Crítica" }, { value: "advertencia", label: "Advertencia" }, { value: "atencion", label: "Atención" }, { value: "normal", label: "Informativa" }]} />
        <SelectFilter label="Estado" value={st} onChange={(v) => { setSt(v); reset(); }} options={[{ value: "todos", label: "Todos" }, { value: "open", label: "Abierta" }, { value: "acknowledged", label: "En revisión" }, { value: "resolved", label: "Resuelta" }]} />
        <SelectFilter label="Astronauta" value={who} onChange={(v) => { setWho(v); reset(); }} options={[{ value: "", label: "Todos" }, ...(astronauts.data ?? []).map((a) => ({ value: a.id, label: a.full_name ?? a.id.slice(0, 8) }))]} />
      </FilterBar>
      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="min-w-0">
          <DataView state={alerts} empty={(d) => d.length === 0} emptyHint="Todavía no hay alertas en la base de datos.">
            {(all) =>
              list.length === 0 ? (
                <p className="text-[13px] text-muted">Ninguna alerta coincide con los filtros.</p>
              ) : (
                <>
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-left text-[13px]">
                      <thead className="bg-surface text-[11px] tracking-wider text-muted uppercase">
                        <tr>{["Severidad", "Alerta", "Astronauta", "Fecha", "Estado"].map((h) => <th key={h} className="px-3 py-2.5 font-semibold whitespace-nowrap">{h}</th>)}</tr>
                      </thead>
                      <tbody>
                        {slice.map((a) => {
                          const s = STATE[alertStateOf(a)];
                          return (
                            <tr key={a.id} onClick={() => setOpen(a)} className={`cursor-pointer border-t border-border hover:bg-surface/60 ${open?.id === a.id ? "bg-cyan-400/5" : ""}`}>
                              <td className="px-3 py-2.5"><LevelTag level={severityOf(a.severity)} raw={a.severity} /></td>
                              <td className="px-3 py-2.5">
                                <span className="font-semibold" data-no-i18n>{a.title ?? a.alert_code ?? "Alerta"}</span>
                                {a.alert_category && <span className="ml-2 text-xs text-muted" data-no-i18n>{a.alert_category}</span>}
                              </td>
                              <td className="px-3 py-2.5 whitespace-nowrap" data-no-i18n>{name(a.astronaut_id)}</td>
                              <td className="px-3 py-2.5 whitespace-nowrap">{fmtDate(a.triggered_at ?? a.created_at, true)}</td>
                              <td className="px-3 py-2.5"><Tag tone={s.tone}>{s.label}</Tag></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <Pagination page={p} pages={pages} total={list.length} onPage={setPage} />
                  {all.length >= ALERTS_LIMIT && <p className="mt-1 text-xs text-muted">Se muestran las {ALERTS_LIMIT} alertas más recientes.</p>}
                </>
              )
            }
          </DataView>
        </div>
        <div className="min-w-0">
          {open ? <AlertDetail alert={open} astronaut={astronauts.data?.find((x) => x.id === open.astronaut_id)} onClose={() => setOpen(null)} /> : (
            <Panel title="Detalle"><p className="text-[13px] text-muted">Elige una alerta para ver sus evidencias e intervenciones.</p></Panel>
          )}
        </div>
      </div>
    </>
  );
}

function AlertDetail({ alert: a, astronaut, onClose }: { alert: HealthAlert; astronaut?: Astronaut; onClose: () => void }) {
  const evidence = useData(`ground:evidence:${a.id}`, async () => {
    const links = await getEvidence(a.id);
    const records = await getTelemetryByIds(links.map((l) => l.telemetry_record_id).filter((x): x is string => Boolean(x)));
    return links.map((l) => ({ link: l, record: records.find((r) => r.id === l.telemetry_record_id) }));
  });
  const interventions = useData(`ground:interventions:${a.id}`, () => getInterventions(a.id));
  const event = useData(a.simulation_event_id ? `ground:sim-event:${a.simulation_event_id}` : null, () => getSimulationEvent(a.simulation_event_id!));
  const s = STATE[alertStateOf(a)];
  return (
    <Panel
      title={<span data-no-i18n>{a.title ?? a.alert_code ?? "Alerta"}</span>}
      subtitle={astronaut ? <Link href={`/ground/astronauts/${astronaut.id}`} className="hover:text-cyan-300" data-no-i18n>{astronaut.full_name}</Link> : undefined}
      right={<button type="button" onClick={onClose} className="text-muted hover:text-fg" aria-label="Cerrar detalle"><X className="size-4" /></button>}
    >
      <div className="flex flex-wrap gap-1.5">
        <LevelTag level={severityOf(a.severity)} raw={a.severity} />
        <Tag tone={s.tone}>{s.label}</Tag>
        {a.alert_code && <Tag><span data-no-i18n>{a.alert_code}</span></Tag>}
      </div>
      {a.description && <p className="mt-3 text-[13px] leading-relaxed text-muted" data-no-i18n>{a.description}</p>}
      <dl className="mt-3 grid grid-cols-2 gap-3">
        <Field label="Disparada">{fmtDate(a.triggered_at ?? a.created_at, true)}</Field>
        <Field label="Reconocida">{fmtDate(a.acknowledged_at, true)}</Field>
        <Field label="Resuelta">{fmtDate(a.resolved_at, true)}</Field>
        <Field label="Categoría"><span data-no-i18n>{a.alert_category ?? "—"}</span></Field>
      </dl>
      {event.data && (
        <div className="mt-3 rounded-md border border-border p-2.5 text-[13px]">
          <p className="flex items-center gap-2 text-[11px] font-semibold tracking-wider text-muted uppercase">Evento de simulación <ProvenanceTag value={provenanceOf(event.data.provenance ?? "synthetic")} /></p>
          <p className="mt-1" data-no-i18n>{event.data.description ?? event.data.event_type ?? "—"}</p>
        </div>
      )}

      <p className="mt-4 text-[11px] font-semibold tracking-wider text-muted uppercase">Evidencias de telemetría</p>
      <DataView state={evidence} rows={2} empty={(d) => d.length === 0} emptyHint="Esta alerta no tiene evidencias registradas.">
        {(list) => (
          <ul className="mt-1.5 flex flex-col gap-1.5">
            {list.map(({ link, record: r }) => (
              <li key={link.id} className="rounded-md border border-border p-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-muted">{r ? fmtDate(r.recorded_at, true) : "Registro no encontrado"}</span>
                  <span className="flex gap-1">{link.evidence_role && <Tag><span data-no-i18n>{link.evidence_role}</span></Tag>}{r && <ProvenanceTag value={provenanceOf(r.source_type)} />}</span>
                </div>
                {r && (
                  <p className="mt-1 font-mono">
                    FC {fmtNum(r.heart_rate, "lpm")} · SpO₂ {fmtNum(r.spo2, "%", 1)} · T {fmtNum(r.body_temperature, "°C", 1)} · FR {fmtNum(r.respiratory_rate, "rpm")}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </DataView>

      <p className="mt-4 text-[11px] font-semibold tracking-wider text-muted uppercase">Intervenciones</p>
      <DataView state={interventions} rows={2} empty={(d) => d.length === 0} emptyHint="Sin intervenciones registradas.">
        {(list) => (
          <ol className="mt-1.5 flex flex-col gap-1.5">
            {list.map((iv) => (
              <li key={iv.id} className="rounded-md border border-border p-2 text-[13px]">
                <p className="flex items-center justify-between gap-2"><span className="font-semibold" data-no-i18n>{iv.intervention_type ?? "Intervención"}</span><span className="font-mono text-xs text-muted">{fmtDate(iv.executed_at, true)}</span></p>
                {iv.description && <p className="mt-0.5 text-xs text-muted" data-no-i18n>{iv.description}</p>}
                {iv.outcome && <p className="mt-0.5 text-xs">Resultado: <span data-no-i18n>{iv.outcome}</span></p>}
              </li>
            ))}
          </ol>
        )}
      </DataView>
    </Panel>
  );
}
