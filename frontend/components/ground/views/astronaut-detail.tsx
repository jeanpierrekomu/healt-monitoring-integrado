"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageTitle } from "@/components/ground/shell";
import { DataView, Empty, Field, LevelTag, Panel, Photo, Tag } from "@/components/ground/ui";
import { asList, asText, fmtDate, fmtNum, missionOriginOf, severityOf } from "@/lib/ground/labels";
import { useData } from "@/lib/ground/use-data";
import { photoUrl } from "@/lib/supabase";
import { getAlerts } from "@/lib/queries/alerts";
import { getAgencies, getAstronaut, getBaselines, getMissions, getMissionsOfAstronaut, getProfile } from "@/lib/queries/catalog";
import { countTelemetryByAstronaut } from "@/lib/queries/telemetry";

export function AstronautDetailView() {
  const { id } = useParams<{ id: string }>();
  const astronaut = useData(`ground:astronaut:${id}`, () => getAstronaut(id));
  const profile = useData(`ground:profile:${id}`, () => getProfile(id));
  const crew = useData(`ground:crew-of:${id}`, () => getMissionsOfAstronaut(id));
  const missions = useData("ground:missions", getMissions);
  const agencies = useData("ground:agencies", getAgencies);
  const baselines = useData(`ground:baselines:${id}`, () => getBaselines(id));
  const telemetry = useData(`ground:telemetry-count:${id}`, () => countTelemetryByAstronaut(id));
  const alerts = useData(`ground:alerts-of:${id}`, () => getAlerts({ astronautId: id }));

  return (
    <>
      <Link href="/ground/astronauts" className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-fg">
        <ArrowLeft className="size-3.5" /> Astronautas
      </Link>
      <DataView state={astronaut} empty={(a) => !a} emptyHint="Este astronauta no existe en la base de datos.">
        {(a) => {
          if (!a) return null;
          const ag = agencies.data?.find((x) => x.id === a.agency_id);
          const myMissions = (crew.data ?? []).map((c) => ({ crew: c, mission: missions.data?.find((m) => m.id === c.mission_id) }));
          return (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-4">
                <Photo src={photoUrl("astronaut-photos", a.image_path)} name={a.full_name} size={88} rounded="rounded-lg" />
                <div className="min-w-0">
                  <PageTitle title={a.full_name ?? "Sin nombre"} subtitle={[a.nationality, ag?.name].filter(Boolean).join(" · ")} />
                </div>
              </div>
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
                <div className="flex flex-col gap-4">
                  <Panel title="Perfil">
                    <dl className="grid grid-cols-2 gap-3 md:grid-cols-3">
                      <Field label="Estado profesional"><span data-no-i18n>{a.career_status ?? "—"}</span></Field>
                      <Field label="Activo">{a.is_active === null ? "—" : a.is_active ? "Sí" : "No"}</Field>
                      <Field label="Género"><span data-no-i18n>{a.gender ?? "—"}</span></Field>
                      <Field label="Nacimiento">{fmtDate(a.birth_date)}</Field>
                      <Field label="Selección">{fmtDate(a.selection_date)}</Field>
                      <Field label="Agencia"><span data-no-i18n>{ag?.acronym ?? ag?.name ?? "—"}</span></Field>
                    </dl>
                    {a.biography && <p className="mt-4 text-[13px] leading-relaxed text-muted" data-no-i18n>{a.biography}</p>}
                  </Panel>
                  <Panel title="Formación y especializaciones">
                    <DataView state={profile} rows={2} empty={(p) => !p} emptyHint="No hay perfil registrado para este astronauta.">
                      {(p) => (
                        <dl className="grid gap-3 md:grid-cols-2">
                          <Field label="Formación"><span data-no-i18n>{asText(p?.education) || "—"}</span></Field>
                          <Field label="Especializaciones">
                            {asList(p?.specializations).length ? (
                              <span className="flex flex-wrap gap-1">{asList(p?.specializations).map((s) => <Tag key={s}><span data-no-i18n>{s}</span></Tag>)}</span>
                            ) : "—"}
                          </Field>
                        </dl>
                      )}
                    </DataView>
                  </Panel>
                  <Panel title="Misiones y experiencia">
                    <DataView state={crew} rows={2} empty={(d) => d.length === 0} emptyHint="No participó en ninguna misión registrada.">
                      {() => (
                        <ul className="flex flex-col divide-y divide-border">
                          {myMissions.map(({ crew: c, mission: m }) => (
                            <li key={c.id} className="flex items-center justify-between gap-3 py-2 text-[13px] first:pt-0 last:pb-0">
                              {m ? (
                                <Link href={`/ground/missions/${m.id}`} className="min-w-0 font-semibold hover:text-cyan-300">
                                  <span data-no-i18n>{m.name ?? m.mission_code ?? "Misión"}</span>
                                  <span className="ml-2 font-normal text-muted">{fmtDate(m.launch_date)}</span>
                                </Link>
                              ) : (
                                <span className="text-muted">Misión no encontrada</span>
                              )}
                              <span className="flex shrink-0 gap-1">
                                {m && <Tag tone={missionOriginOf(m) === "historical" ? "cyan" : missionOriginOf(m) === "custom" ? "violet" : "gray"}>{missionOriginOf(m) === "historical" ? "Histórica" : missionOriginOf(m) === "custom" ? "Personalizada" : "Sin tipo"}</Tag>}
                                {c.mission_role && <Tag><span data-no-i18n>{c.mission_role}</span></Tag>}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </DataView>
                  </Panel>
                </div>
                <div className="flex flex-col gap-4">
                  <Panel title="Salud y registros">
                    <dl className="grid grid-cols-2 gap-3">
                      <Field label="Registros de telemetría">{telemetry.loading ? "…" : telemetry.error ? "Error" : (telemetry.data ?? 0).toLocaleString("es")}</Field>
                      <Field label="Alertas">{alerts.loading ? "…" : alerts.error ? "Error" : (alerts.data?.length ?? 0)}</Field>
                    </dl>
                    <Link href={`/ground/monitoring?astronaut=${a.id}`} className="mt-3 inline-block text-xs font-semibold text-cyan-300 hover:underline">Ver telemetría</Link>
                  </Panel>
                  <Panel title="Rangos de referencia" subtitle="Valores de referencia registrados (health_baselines)">
                    <DataView state={baselines} rows={2} empty={(d) => d.length === 0} emptyHint="No hay rangos de referencia para este astronauta.">
                      {(list) => {
                        const b = list[0];
                        return (
                          <dl className="grid grid-cols-2 gap-3">
                            <Field label="Pulso">{fmtNum(b.heart_rate_min)} – {fmtNum(b.heart_rate_max, "lpm")}</Field>
                            <Field label="SpO₂">{fmtNum(b.spo2_min)} – {fmtNum(b.spo2_max, "%")}</Field>
                            <Field label="Temperatura">{fmtNum(b.temperature_min, "", 1)} – {fmtNum(b.temperature_max, "°C", 1)}</Field>
                            <Field label="Respiración">{fmtNum(b.respiratory_rate_min)} – {fmtNum(b.respiratory_rate_max, "rpm")}</Field>
                          </dl>
                        );
                      }}
                    </DataView>
                  </Panel>
                  <Panel title="Alertas recientes">
                    <DataView state={alerts} rows={2} empty={(d) => d.length === 0} emptyHint="Sin alertas registradas.">
                      {(list) => (
                        <ul className="flex flex-col gap-2">
                          {list.slice(0, 5).map((al) => (
                            <li key={al.id} className="flex items-center justify-between gap-2 text-[13px]">
                              <span className="min-w-0 truncate" data-no-i18n>{al.title ?? al.alert_code ?? "Alerta"}</span>
                              <LevelTag level={severityOf(al.severity)} raw={al.severity} />
                            </li>
                          ))}
                        </ul>
                      )}
                    </DataView>
                  </Panel>
                </div>
              </div>
            </div>
          );
        }}
      </DataView>
      {!astronaut.loading && !astronaut.error && astronaut.data === null && <Empty title="Astronauta no encontrado" />}
    </>
  );
}
