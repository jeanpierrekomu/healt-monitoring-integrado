"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PageTitle } from "@/components/ground/shell";
import { DataView, FilterBar, Pagination, SearchInput, SelectFilter, Tag, usePageSlice, type Tone } from "@/components/ground/ui";
import { fmtDate, missionOriginOf, missionStatusOf, type MissionOrigin, type MissionStatus } from "@/lib/ground/labels";
import { useData } from "@/lib/ground/use-data";
import { getMissions, getSpaceships } from "@/lib/queries/catalog";

const PAGE = 15;
export const ORIGIN_LABEL: Record<MissionOrigin, { label: string; tone: Tone }> = {
  historical: { label: "Histórica", tone: "cyan" },
  custom: { label: "Personalizada", tone: "violet" },
  unknown: { label: "Sin tipo", tone: "gray" },
};
export const STATUS_LABEL: Record<MissionStatus, { label: string; tone: Tone }> = {
  active: { label: "Activa", tone: "green" },
  completed: { label: "Completada", tone: "gray" },
  planned: { label: "Planificada", tone: "cyan" },
  cancelled: { label: "Cancelada", tone: "red" },
  unknown: { label: "Sin estado", tone: "gray" },
};

export function MissionsView() {
  const missions = useData("ground:missions", getMissions);
  const ships = useData("ground:spaceships", getSpaceships);
  const [q, setQ] = useState("");
  const [origin, setOrigin] = useState<"todas" | MissionOrigin>("todas");
  const [status, setStatus] = useState<"todos" | MissionStatus>("todos");
  const [type, setType] = useState("todos");
  const [page, setPage] = useState(0);
  const list = useMemo(() => missions.data ?? [], [missions.data]);
  const types = useMemo(() => [...new Set(list.map((m) => m.mission_type).filter((x): x is string => Boolean(x)))].sort(), [list]);
  const filtered = list.filter((m) => {
    if (q && !`${m.name ?? ""} ${m.mission_code ?? ""} ${m.destination ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (origin !== "todas" && missionOriginOf(m) !== origin) return false;
    if (status !== "todos" && missionStatusOf(m.mission_status) !== status) return false;
    if (type !== "todos" && m.mission_type !== type) return false;
    return true;
  });
  const { slice, pages, page: p } = usePageSlice(filtered, page, PAGE);
  const ship = (id: string | null) => ships.data?.find((s) => s.id === id)?.name ?? "—";
  const reset = () => setPage(0);

  return (
    <>
      <PageTitle title="Misiones" subtitle="Misiones históricas (documentadas) y personalizadas (creadas para simular)." />
      <FilterBar>
        <SearchInput value={q} onChange={(v) => { setQ(v); reset(); }} placeholder="Buscar por nombre, código o destino…" />
        <SelectFilter label="Origen" value={origin} onChange={(v) => { setOrigin(v); reset(); }} options={[{ value: "todas", label: "Todas" }, { value: "historical", label: "Históricas" }, { value: "custom", label: "Personalizadas" }]} />
        <SelectFilter label="Estado" value={status} onChange={(v) => { setStatus(v); reset(); }} options={[{ value: "todos", label: "Todos" }, { value: "active", label: "Activa" }, { value: "completed", label: "Completada" }, { value: "planned", label: "Planificada" }, { value: "cancelled", label: "Cancelada" }]} />
        <SelectFilter label="Tipo" value={type} onChange={(v) => { setType(v); reset(); }} options={[{ value: "todos", label: "Todos" }, ...types.map((t) => ({ value: t, label: t }))]} />
      </FilterBar>
      <div className="mt-4">
        <DataView state={missions} empty={(d) => d.length === 0} emptyHint="Todavía no hay misiones en la base de datos.">
          {() =>
            filtered.length === 0 ? (
              <p className="text-[13px] text-muted">Ninguna misión coincide con los filtros.</p>
            ) : (
              <>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-left text-[13px]">
                    <thead className="bg-surface text-[11px] tracking-wider text-muted uppercase">
                      <tr>{["Misión", "Código", "Origen", "Destino", "Nave", "Lanzamiento", "Regreso", "Estado"].map((h) => <th key={h} className="px-3 py-2.5 font-semibold whitespace-nowrap">{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {slice.map((m) => {
                        const o = ORIGIN_LABEL[missionOriginOf(m)];
                        const s = STATUS_LABEL[missionStatusOf(m.mission_status)];
                        return (
                          <tr key={m.id} className="border-t border-border hover:bg-surface/60">
                            <td className="px-3 py-2.5 font-semibold"><Link href={`/ground/missions/${m.id}`} className="hover:text-cyan-300" data-no-i18n>{m.name ?? "Sin nombre"}</Link></td>
                            <td className="px-3 py-2.5 font-mono text-xs" data-no-i18n>{m.mission_code ?? "—"}</td>
                            <td className="px-3 py-2.5"><Tag tone={o.tone}>{o.label}</Tag></td>
                            <td className="px-3 py-2.5" data-no-i18n>{m.destination ?? "—"}</td>
                            <td className="px-3 py-2.5" data-no-i18n>{ship(m.spaceship_id)}</td>
                            <td className="px-3 py-2.5 whitespace-nowrap">{fmtDate(m.launch_date)}</td>
                            <td className="px-3 py-2.5 whitespace-nowrap">{fmtDate(m.return_date)}</td>
                            <td className="px-3 py-2.5"><span title={m.mission_status ?? undefined}><Tag tone={s.tone}>{s.label}</Tag></span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <Pagination page={p} pages={pages} total={filtered.length} onPage={setPage} />
              </>
            )
          }
        </DataView>
      </div>
    </>
  );
}
