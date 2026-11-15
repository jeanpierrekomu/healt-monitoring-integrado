"use client";

import { useEffect, useRef, useState } from "react";
import { initialSeries, nextReading } from "@/services/readings";

export interface LiveLine {
  key: string;
  base: number;
  amp: number;
  seed: string;
}

export type LiveRow = { t: number } & Record<string, number>;

/**
 * Serie en tiempo real simulada: cada `intervalMs` entra una lectura nueva y sale la más antigua.
 * Cuando exista la API, este hook se cambia por una suscripción (WebSocket / Supabase Realtime).
 */
export function useLiveSeries(lines: LiveLine[], points = 40, intervalMs = 1000) {
  const [data, setData] = useState<LiveRow[]>(() => {
    const init = lines.map((l) => initialSeries(l.seed, l.base, l.amp, points));
    return Array.from({ length: points }, (_, i) => {
      const row = { t: i } as LiveRow;
      lines.forEach((l, j) => (row[l.key] = init[j][i]));
      return row;
    });
  });
  const linesRef = useRef(lines);
  useEffect(() => {
    linesRef.current = lines;
  });

  useEffect(() => {
    const id = setInterval(() => {
      setData((prev) => {
        const last = prev[prev.length - 1];
        const row = { t: last.t + 1 } as LiveRow;
        for (const l of linesRef.current) row[l.key] = nextReading(last[l.key] ?? l.base, l.base, l.amp);
        return [...prev.slice(1), row];
      });
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return data;
}

/** Un solo valor que fluctúa de forma realista (para tarjetas y KPIs). */
export function useLiveValue(base: number, amp: number, intervalMs = 2000) {
  const [value, setValue] = useState(base);
  useEffect(() => {
    const id = setInterval(() => setValue((v) => nextReading(v, base, amp)), intervalMs);
    return () => clearInterval(id);
  }, [base, amp, intervalMs]);
  return value;
}
