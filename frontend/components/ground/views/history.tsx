"use client";

import { ExternalLink } from "lucide-react";
import { useMemo, useState } from "react";
import { PageTitle } from "@/components/ground/shell";
import { DataView, FilterBar, LevelTag, Pagination, SelectFilter, Tag, usePageSlice } from "@/components/ground/ui";
import { certaintyOf, fmtDate, severityOf, type Certainty } from "@/lib/ground/labels";
import { useData } from "@/lib/ground/use-data";
import { getAstronauts } from "@/lib/queries/catalog";
import { getEventSources, getHistoricalEvents } from "@/lib/queries/history";

const PAGE = 15;
const CERT: Record<Certainty, { label: string; tone: "cyan" | "amber" | "gray"; hint: string }> = {
  documented: { label: "Documentado", tone: "cyan", hint: "Respaldado por fuentes" },
  reconstructed: { label: "Reconstruido", tone: "amber", hint: "Estimado a partir de información parcial" },
  unknown: { label: "Sin certeza indicada", tone: "gray", hint: "La base no indica el nivel de certeza" },
};

export function HistoryView() {
  const events = useData("ground:history", () => getHistoricalEvents());
  const astronauts = useData("ground:astronauts", getAstronauts);
  const [cat, setCat] = useState("todas");
  const [cert, setCert] = useState<"todas" | Certainty>("todas");
  const [page, setPage] = useState(0);
  const all = useMemo(() => events.data ?? [], [events.data]);
  const cats = useMemo(() => [...new Set(all.map((e) => e.event_category).filter((x): x is string => Boolean(x)))].sort(), [all]);
  const list = all.filter((e) => (cat === "todas" || e.event_category === cat) && (cert === "todas" || certaintyOf(e.certainty) === cert));
  const { slice, pages, page: p } = usePageSlice(list, page, PAGE);
  const ids = slice.map((e) => e.id);
  const sources = useData(ids.length ? `ground:event-sources:${ids.join(",")}` : null, () => getEventSources(ids));
  const name = (id: string | null) => astronauts.data?.find((a) => a.id === id)?.full_name;

  return (
    <>
      <PageTitle title="Historial de eventos" subtitle="Eventos históricos con su nivel de certeza documental y las fuentes que los respaldan." />
      <FilterBar>
        <SelectFilter label="Categoría" value={cat} onChange={(v) => { setCat(v); setPage(0); }} options={[{ value: "todas", label: "Todas" }, ...cats.map((c) => ({ value: c, label: c }))]} />
        <SelectFilter label="Certeza" value={cert} onChange={(v) => { setCert(v); setPage(0); }} options={[{ value: "todas", label: "Todas" }, { value: "documented", label: "Documentados" }, { value: "reconstructed", label: "Reconstruidos" }]} />
      </FilterBar>
      <div className="mt-4">
        <DataView state={events} empty={(d) => d.length === 0} emptyHint="Todavía no hay eventos históricos en la base de datos.">
          {() =>
            list.length === 0 ? (
              <p className="text-[13px] text-muted">Ningún evento coincide con los filtros.</p>
            ) : (
              <>
                <ol className="relative flex flex-col gap-3 border-l border-border pl-5">
                  {slice.map((e) => {
                    const c = CERT[certaintyOf(e.certainty)];
                    const srcs = sources.data?.get(e.id) ?? [];
                    return (
                      <li key={e.id} className="relative">
                        <span className={`absolute top-3 -left-[25px] size-2.5 rounded-full border-2 border-[#060a12] ${c.tone === "amber" ? "bg-amber-400" : c.tone === "cyan" ? "bg-cyan-400" : "bg-slate-500"}`} />
                        <article className={`rounded-lg border bg-surface/80 p-3 ${c.tone === "amber" ? "border-dashed border-amber-400/40" : "border-border"}`}>
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-mono text-xs text-muted">{fmtDate(e.occurred_at, true)}</p>
                              <h3 className="text-[14px] font-semibold" data-no-i18n>{e.event_title ?? "Evento sin título"}</h3>
                              <p className="text-xs text-muted"><span data-no-i18n>{e.event_category ?? "—"}</span>{name(e.astronaut_id) && <> · <span data-no-i18n>{name(e.astronaut_id)}</span></>}</p>
                            </div>
                            <span className="flex flex-wrap gap-1">
                              <span title={`${c.hint}${e.certainty ? ` (${e.certainty})` : ""}`}><Tag tone={c.tone}>{c.label}</Tag></span>
                              <LevelTag level={severityOf(e.severity)} raw={e.severity} />
                            </span>
                          </div>
                          {e.event_description && <p className="mt-2 text-[13px] leading-relaxed text-muted" data-no-i18n>{e.event_description}</p>}
                          <div className="mt-2 border-t border-border pt-2 text-xs">
                            {sources.loading && !sources.data ? <span className="text-muted">Cargando fuentes…</span> : srcs.length === 0 ? <span className="text-muted">Sin fuentes asociadas</span> : (
                              <ul className="flex flex-col gap-1">
                                {srcs.map((s) => (
                                  <li key={s.id} className="flex flex-wrap items-center gap-1.5">
                                    <span className="font-semibold" data-no-i18n>{s.source_name ?? "Fuente"}</span>
                                    <span className="text-muted" data-no-i18n>{[s.organization, s.source_type].filter(Boolean).join(" · ")}</span>
                                    {s.source_url && <a href={s.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-cyan-300 hover:underline">Abrir <ExternalLink className="size-3" /></a>}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </article>
                      </li>
                    );
                  })}
                </ol>
                <Pagination page={p} pages={pages} total={list.length} onPage={setPage} />
              </>
            )
          }
        </DataView>
      </div>
    </>
  );
}
