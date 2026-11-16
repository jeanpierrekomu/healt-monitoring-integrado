"use client";

// Gráficos del visor en Tierra (Recharts). Los valores ausentes se dejan como huecos: nunca se rellenan con cero.
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const GRID = "#1f2a40";
const AXIS = { fill: "#8a97ad", fontSize: 11 };
const TIP = { background: "#0e1524", border: "1px solid #1f2a40", borderRadius: 6, fontSize: 12 };

export interface SeriesDef {
  key: string;
  label: string;
  color: string;
}

/** Serie temporal con una o varias líneas. `data` lleva `t` (texto del eje) y una columna por serie. */
export function TimeChart({ data, series, unit, height = 180, domain }: {
  data: Record<string, number | string | null>[];
  series: SeriesDef[];
  unit?: string;
  height?: number;
  domain?: [number | "auto", number | "auto"];
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -6 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="t" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={40} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} domain={domain ?? ["auto", "auto"]} width={48} tickFormatter={(v: number) => (Math.abs(v) >= 20 ? String(Math.round(v)) : v.toFixed(1))} />
        <Tooltip contentStyle={TIP} labelStyle={{ color: "#8a97ad" }} formatter={(v) => (v === null || v === undefined ? "Sin dato" : `${v}${unit ? ` ${unit}` : ""}`)} />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} iconType="plainline" />}
        {series.map((s) => (
          <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={1.6} dot={false} connectNulls={false} isAnimationActive={false} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function BarsChart({ data, bars, height = 200 }: { data: Record<string, number | string>[]; bars: SeriesDef[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="t" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={24} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} width={44} />
        <Tooltip contentStyle={TIP} labelStyle={{ color: "#8a97ad" }} cursor={{ fill: "rgb(255 255 255 / 0.04)" }} />
        {bars.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
        {bars.map((b) => (
          <Bar key={b.key} dataKey={b.key} name={b.label} stackId="a" fill={b.color} isAnimationActive={false} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
