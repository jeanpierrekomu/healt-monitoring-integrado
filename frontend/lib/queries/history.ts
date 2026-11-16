// Eventos históricos y sus fuentes.
import { supabase } from "@/lib/supabase";
import type { DataSource, HistoricalEvent, HistoricalEventSource } from "@/types/database";
import { rows } from "./core";

export const getHistoricalEvents = (limit = 500) =>
  rows<HistoricalEvent>(supabase().from("historical_events").select("*").order("occurred_at", { ascending: false, nullsFirst: false }).limit(limit));

/** Fuentes de varios eventos a la vez: evento → lista de fuentes. */
export async function getEventSources(eventIds: string[]): Promise<Map<string, DataSource[]>> {
  const out = new Map<string, DataSource[]>();
  if (!eventIds.length) return out;
  const links = await rows<HistoricalEventSource>(supabase().from("historical_event_sources").select("*").in("historical_event_id", eventIds));
  const ids = [...new Set(links.map((l) => l.source_id).filter((x): x is string => Boolean(x)))];
  const sources = ids.length ? await rows<DataSource>(supabase().from("data_sources").select("*").in("id", ids)) : [];
  const map = new Map(sources.map((s) => [s.id, s]));
  for (const l of links) {
    const s = l.source_id ? map.get(l.source_id) : undefined;
    if (!s || !l.historical_event_id) continue;
    out.set(l.historical_event_id, [...(out.get(l.historical_event_id) ?? []), s]);
  }
  return out;
}
