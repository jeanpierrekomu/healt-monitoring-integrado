"use client";

import { Activity, Bell, FlaskConical, Satellite, ServerCog, Siren, Users } from "lucide-react";
import Link from "next/link";
import { BarsChart } from "@/components/ground/charts";
import { PageTitle } from "@/components/ground/shell";
import { DataView, Empty, LevelTag, Panel, ProvenanceTag, Stat, Tag } from "@/components/ground/ui";
import { certaintyOf, fmtDate, missionStatusOf, provenanceOf, severityOf } from "@/lib/ground/labels";
import { useData } from "@/lib/ground/use-data";
import { getDashboard } from "@/lib/queries/dashboard";
import { getResults } from "@/lib/queries/simulation";
import { getTelemetryActivity } from "@/lib/queries/telemetry";

const DAYS = 30;

export function DashboardView() {
  const dash = useData("ground:dashboard", getDashboard);
  const activity = useData("ground:telemetry-activity", () => getTelemetryActivity(DAYS));
  const sessionIds = dash.data?.sessions.map((s) => s.id) ?? [];
  const results = useData(sessionIds.length ? `ground:results:${sessionIds.join(",")}` : null, () => getResults(sessionIds));

  return (
    <>
      <PageTitle title="Panel de control" subtitle="Resumen de misiones, tripulación, alertas y simulaciones leído de la base de datos." />
      <DataView state={dash} rows={3}>
        {(d) => {
          const active = d.missions.filter((m) => missionStatusOf(m.mission_status) === "active").length;
          const critical = d.alerts.filter((a) => severityOf(a.severity) === "critico").length;
          const emptyDb = d.missions.length === 0 && d.astronauts === 0 && d.telemetry === 0;
          return (
            <div className="flex flex-col gap-4">
              {emptyDb && (
                <p className="rounded-lg border border-atencion/40 bg-atencion/10 px-4 py-3 text-[13px] text-atencion">
                  La base de datos está conectada pero todavía no tiene misiones, astronautas ni telemetría. Las pantallas se llenarán cuando se carguen los datos.
                </p>
              )}
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
                <Stat icon={Satellite} label="Misiones" value={d.missions.length} />
                <Stat icon={Users} label="Astronautas" value={d.astronauts} />
                <Stat icon={Activity} label="Misiones activas" value={active} tone="cyan" />
                <Stat icon={Bell} label="Alertas generadas" value={d.alerts.length} tone={d.alerts.length ? "yellow" : undefined} />
                <Stat icon={Siren} label="Alertas críticas" value={critical} tone={critical ? "red" : undefined} />
              </div>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
                <Panel title="Actividad de telemetría" subtitle={`Registros recibidos por día · últimos ${DAYS} días`}>
                  <DataView state={activity} rows={3} empty={(list) => list.length === 0} emptyHint="No hay registros de telemetría en este periodo.">
                    {(list) => {
                      const byDay = new Map<string, { real: number; reconstructed: number; synthetic: number; unknown: number }>();
                      for (let i = DAYS - 1; i >= 0; i--) {
                        const k = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
                        byDay.set(k, { real: 0, reconstructed: 0, synthetic: 0, unknown: 0 });
                      }
                      for (const r of list) {
                        const k = r.recorded_at?.slice(0, 10);
                        const slot = k ? byDay.get(k) : undefined;
                        if (slot) slot[provenanceOf(r.source_type)]++;
                      }
                      const data = [...byDay].map(([k, v]) => ({ t: k.slice(5), ...v }));
                      return (
                        <>
                          <BarsChart
                            data={data}
                            bars={[
                              { key: "real", label: "Real", color: "#22d3ee" },
                              { key: "reconstructed", label: "Reconstruido", color: "#fbbf24" },
                              { key: "synthetic", label: "Sintético", color: "#a78bfa" },
                              { key: "unknown", label: "Sin procedencia", color: "#475569" },
                            ]}
                          />
                          <p className="mt-2 text-xs text-muted">{list.length} registros en total{list.length >= 20_000 ? " (se muestran los primeros 20 000)" : ""}.</p>
                        </>
                      );
                    }}
                  </DataView>
                </Panel>

                <Panel title="Estado del sistema" right={<ServerCog className="size-4 text-muted" />}>
                  <dl className="flex flex-col gap-2.5 text-[13px]">
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-muted">Conexión con Supabase</dt>
                      <dd><Tag tone="green">En línea</Tag></dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-muted">Tiempo de respuesta</dt>
                      <dd className="font-mono">{d.latencyMs} ms</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-muted">Registros de telemetría</dt>
                      <dd className="font-mono">{d.telemetry.toLocaleString("es")}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-muted">Última importación</dt>
                      <dd className="text-right font-mono text-xs">
                        {d.lastImport ? (
                          <>
                            <span data-no-i18n>{d.lastImport.file_name ?? "—"}</span>
                            <br />
                            {fmtDate(d.lastImport.started_at ?? d.lastImport.created_at, true)}
                          </>
                        ) : (
                          "Ninguna"
                        )}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-muted">Modo de la interfaz</dt>
                      <dd><Tag tone="cyan">Solo lectura</Tag></dd>
                    </div>
                  </dl>
                </Panel>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <Panel title="Últimos eventos históricos" right={<Link href="/ground/history" className="text-xs font-semibold text-cyan-300 hover:underline">Ver historial</Link>}>
                  {d.events.length === 0 ? (
                    <Empty hint="Todavía no hay eventos históricos registrados." />
                  ) : (
                    <ul className="flex flex-col divide-y divide-border">
                      {d.events.map((e) => (
                        <li key={e.id} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-semibold" data-no-i18n>{e.event_title ?? "Evento sin título"}</p>
                            <p className="text-xs text-muted">{fmtDate(e.occurred_at)} · <span data-no-i18n>{e.event_category ?? "—"}</span></p>
                          </div>
                          <span className="flex shrink-0 gap-1">
                            <LevelTag level={severityOf(e.severity)} raw={e.severity} />
                            {certaintyOf(e.certainty) === "reconstructed" ? <Tag tone="amber">Reconstruido</Tag> : certaintyOf(e.certainty) === "documented" ? <Tag tone="cyan">Documentado</Tag> : null}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>
                <Panel title="Últimas sesiones de simulación" right={<Link href="/ground/simulation" className="text-xs font-semibold text-cyan-300 hover:underline">Ir a simulación</Link>}>
                  {d.sessions.length === 0 ? (
                    <Empty icon={FlaskConical} hint="Todavía no hay sesiones de simulación guardadas. Puedes ejecutar una simulación local en la sección Simulación." />
                  ) : (
                    <ul className="flex flex-col divide-y divide-border">
                      {d.sessions.map((s) => {
                        const r = results.data?.find((x) => x.session_id === s.id);
                        return (
                          <li key={s.id} className="flex items-center justify-between gap-3 py-2.5 text-[13px] first:pt-0 last:pb-0">
                            <div className="min-w-0">
                              <p className="font-mono text-xs" data-no-i18n>{s.id.slice(0, 8)}</p>
                              <p className="text-xs text-muted">{fmtDate(s.started_at, true)} · <span data-no-i18n>{s.session_status ?? "—"}</span></p>
                            </div>
                            <span className="flex shrink-0 items-center gap-1.5">
                              <ProvenanceTag value="synthetic" />
                              {r && <Tag tone={(r.critical_alerts ?? 0) > 0 ? "red" : "gray"}>{r.total_alerts ?? 0} alertas · {r.critical_alerts ?? 0} críticas</Tag>}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </Panel>
              </div>
            </div>
          );
        }}
      </DataView>
    </>
  );
}
