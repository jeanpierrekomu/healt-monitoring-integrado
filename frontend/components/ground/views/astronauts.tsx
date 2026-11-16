"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PageTitle } from "@/components/ground/shell";
import { DataView, FilterBar, Pagination, Photo, SearchInput, SelectFilter, Tag, usePageSlice } from "@/components/ground/ui";
import { photoUrl } from "@/lib/supabase";
import { useData } from "@/lib/ground/use-data";
import { getAgencies, getAstronauts } from "@/lib/queries/catalog";

const PAGE = 12;

export function AstronautsView() {
  const astronauts = useData("ground:astronauts", getAstronauts);
  const agencies = useData("ground:agencies", getAgencies);
  const [q, setQ] = useState("");
  const [state, setState] = useState("todos");
  const [country, setCountry] = useState("todas");
  const [page, setPage] = useState(0);

  const list = useMemo(() => astronauts.data ?? [], [astronauts.data]);
  const nationalities = useMemo(() => [...new Set(list.map((a) => a.nationality).filter((x): x is string => Boolean(x)))].sort(), [list]);
  const filtered = list.filter((a) => {
    if (q && !`${a.full_name ?? ""} ${a.nationality ?? ""} ${a.career_status ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (state === "activos" && a.is_active !== true) return false;
    if (state === "inactivos" && a.is_active !== false) return false;
    if (country !== "todas" && a.nationality !== country) return false;
    return true;
  });
  const { slice, pages, page: p } = usePageSlice(filtered, page, PAGE);
  const agency = (id: string | null) => agencies.data?.find((x) => x.id === id);

  return (
    <>
      <PageTitle title="Astronautas" subtitle="Tripulantes registrados en la base de datos." />
      <FilterBar>
        <SearchInput value={q} onChange={(v) => { setQ(v); setPage(0); }} placeholder="Buscar por nombre, nacionalidad o estado…" />
        <SelectFilter label="Estado" value={state} onChange={(v) => { setState(v); setPage(0); }} options={[{ value: "todos", label: "Todos" }, { value: "activos", label: "Activos" }, { value: "inactivos", label: "Inactivos" }]} />
        <SelectFilter label="Nacionalidad" value={country} onChange={(v) => { setCountry(v); setPage(0); }} options={[{ value: "todas", label: "Todas" }, ...nationalities.map((n) => ({ value: n, label: n }))]} />
      </FilterBar>
      <div className="mt-4">
        <DataView state={astronauts} empty={(d) => d.length === 0} emptyHint="Todavía no hay astronautas en la base de datos.">
          {() =>
            filtered.length === 0 ? (
              <p className="text-[13px] text-muted">Ningún astronauta coincide con los filtros.</p>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {slice.map((a) => {
                    const ag = agency(a.agency_id);
                    return (
                      <Link key={a.id} href={`/ground/astronauts/${a.id}`} className="flex gap-3 rounded-lg border border-border bg-surface/80 p-3 transition-colors hover:border-cyan-400/50">
                        <Photo src={photoUrl("astronaut-photos", a.image_path)} name={a.full_name} size={64} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-semibold" data-no-i18n>{a.full_name ?? "Sin nombre"}</p>
                          <p className="truncate text-xs text-muted" data-no-i18n>{[a.nationality, ag?.acronym ?? ag?.name].filter(Boolean).join(" · ") || "—"}</p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {a.is_active !== null && <Tag tone={a.is_active ? "green" : "gray"}>{a.is_active ? "Activo" : "Inactivo"}</Tag>}
                            {a.career_status && <Tag tone="cyan"><span data-no-i18n>{a.career_status}</span></Tag>}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
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
