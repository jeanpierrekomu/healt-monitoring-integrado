"use client";

import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageTitle } from "@/components/ground/shell";
import { DataView, Field, Panel, Photo, Tag } from "@/components/ground/ui";
import { ORIGIN_LABEL, STATUS_LABEL } from "@/components/ground/views/missions";
import { daysBetween, fmtDate, missionOriginOf, missionStatusOf } from "@/lib/ground/labels";
import { useData } from "@/lib/ground/use-data";
import { photoUrl } from "@/lib/supabase";
import { getAgencies, getAstronauts, getCrewOfMission, getMission, getMissionSources, getSpaceships, getSupportStaff } from "@/lib/queries/catalog";
import { getSessions } from "@/lib/queries/simulation";

export function MissionDetailView() {
  const { id } = useParams<{ id: string }>();
  const mission = useData(`ground:mission:${id}`, () => getMission(id));
  const crew = useData(`ground:crew:${id}`, () => getCrewOfMission(id));
  const astronauts = useData("ground:astronauts", getAstronauts);
  const staff = useData(`ground:staff:${id}`, () => getSupportStaff(id));
  const sources = useData(`ground:mission-sources:${id}`, () => getMissionSources(id));
  const ships = useData("ground:spaceships", getSpaceships);
  const agencies = useData("ground:agencies", getAgencies);
  const sessions = useData(`ground:sessions:${id}`, () => getSessions(id));

  return (
    <>
      <Link href="/ground/missions" className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-fg">
        <ArrowLeft className="size-3.5" /> Misiones
      </Link>
      <DataView state={mission} empty={(m) => !m} emptyHint="Esta misión no existe en la base de datos.">
        {(m) => {
          if (!m) return null;
          const o = ORIGIN_LABEL[missionOriginOf(m)];
          const s = STATUS_LABEL[missionStatusOf(m.mission_status)];
          const ship = ships.data?.find((x) => x.id === m.spaceship_id);
          const ag = agencies.data?.find((x) => x.id === m.agency_id);
          const days = daysBetween(m.launch_date, m.return_date);
          return (
            <div className="flex flex-col gap-4">
              <PageTitle title={m.name ?? "Misión"} subtitle={m.mission_code ?? undefined} right={<span className="flex gap-1.5"><Tag tone={o.tone}>{o.label}</Tag><Tag tone={s.tone}>{s.label}</Tag></span>} />
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
                <div className="flex flex-col gap-4">
                  <Panel title="Datos de la misión">
                    <dl className="grid grid-cols-2 gap-3 md:grid-cols-3">
                      <Field label="Destino"><span data-no-i18n>{m.destination ?? "—"}</span></Field>
                      <Field label="Tipo"><span data-no-i18n>{m.mission_type ?? "—"}</span></Field>
                      <Field label="Agencia"><span data-no-i18n>{ag?.acronym ?? ag?.name ?? "—"}</span></Field>
                      <Field label="Lanzamiento">{fmtDate(m.launch_date)}</Field>
                      <Field label="Regreso">{fmtDate(m.return_date)}</Field>
                      <Field label="Duración">{days === null ? "—" : `${days} días`}</Field>
                    </dl>
                    {m.objective && (
                      <div className="mt-4">
                        <p className="text-[11px] font-semibold tracking-wider text-muted uppercase">Objetivo</p>
                        <p className="mt-1 text-[13px] leading-relaxed" data-no-i18n>{m.objective}</p>
                      </div>
                    )}
                    {m.description && <p className="mt-3 text-[13px] leading-relaxed text-muted" data-no-i18n>{m.description}</p>}
                  </Panel>
                  <Panel title="Tripulación">
                    <DataView state={crew} rows={2} empty={(d) => d.length === 0} emptyHint="No hay tripulación registrada para esta misión.">
                      {(list) => (
                        <ul className="grid gap-2 sm:grid-cols-2">
                          {list.map((c) => {
                            const a = astronauts.data?.find((x) => x.id === c.astronaut_id);
                            return (
                              <li key={c.id}>
                                <Link href={a ? `/ground/astronauts/${a.id}` : "#"} className="flex items-center gap-3 rounded-md border border-border p-2 hover:border-cyan-400/50">
                                  <Photo src={photoUrl("astronaut-photos", a?.image_path)} name={a?.full_name ?? null} size={40} />
                                  <span className="min-w-0">
                                    <span className="block truncate text-[13px] font-semibold" data-no-i18n>{a?.full_name ?? "Astronauta"}</span>
                                    <span className="block truncate text-xs text-muted" data-no-i18n>{c.mission_role ?? "—"}</span>
                                  </span>
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </DataView>
                  </Panel>
                  <Panel title="Personal de apoyo">
                    <DataView state={staff} rows={2} empty={(d) => d.length === 0} emptyHint="No hay personal de apoyo registrado.">
                      {(list) => (
                        <ul className="flex flex-col divide-y divide-border">
                          {list.map((p) => (
                            <li key={p.id} className="py-2 text-[13px] first:pt-0 last:pb-0">
                              <span className="font-semibold" data-no-i18n>{p.full_name ?? "—"}</span>
                              <span className="ml-2 text-muted" data-no-i18n>{p.support_role ?? ""}</span>
                              {p.description && <p className="text-xs text-muted" data-no-i18n>{p.description}</p>}
                            </li>
                          ))}
                        </ul>
                      )}
                    </DataView>
                  </Panel>
                </div>
                <div className="flex flex-col gap-4">
                  <Panel title="Nave">
                    {ship ? (
                      <div className="flex gap-3">
                        <Photo src={photoUrl("hardware-photos", ship.image_path)} name={ship.name} size={72} />
                        <dl className="grid gap-2">
                          <Field label="Nombre"><span data-no-i18n>{ship.name ?? "—"}</span></Field>
                          <Field label="Tipo"><span data-no-i18n>{ship.vehicle_type ?? "—"}</span></Field>
                          <Field label="Fabricante"><span data-no-i18n>{ship.manufacturer ?? "—"}</span></Field>
                        </dl>
                      </div>
                    ) : (
                      <p className="text-[13px] text-muted">Sin nave registrada.</p>
                    )}
                  </Panel>
                  <Panel title="Fuentes documentales">
                    <DataView state={sources} rows={2} empty={(d) => d.length === 0} emptyHint="No hay fuentes asociadas a esta misión.">
                      {(list) => (
                        <ul className="flex flex-col gap-2.5">
                          {list.map((s) => (
                            <li key={s.id} className="text-[13px]">
                              <p className="font-semibold" data-no-i18n>{s.source_name ?? "Fuente"}</p>
                              <p className="text-xs text-muted"><span data-no-i18n>{[s.organization, s.source_type].filter(Boolean).join(" · ")}</span> · {fmtDate(s.publication_date)}</p>
                              {s.source_url && (
                                <a href={s.source_url} target="_blank" rel="noreferrer" className="mt-0.5 inline-flex items-center gap-1 text-xs text-cyan-300 hover:underline">
                                  Abrir fuente <ExternalLink className="size-3" />
                                </a>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </DataView>
                  </Panel>
                  <Panel title="Sesiones de simulación">
                    <DataView state={sessions} rows={2} empty={(d) => d.length === 0} emptyHint="No hay sesiones de simulación para esta misión.">
                      {(list) => <p className="text-[13px]">{list.length} sesiones · <Link href={`/ground/simulation?mission=${m.id}`} className="font-semibold text-cyan-300 hover:underline">Abrir en Simulación</Link></p>}
                    </DataView>
                  </Panel>
                </div>
              </div>
            </div>
          );
        }}
      </DataView>
    </>
  );
}
