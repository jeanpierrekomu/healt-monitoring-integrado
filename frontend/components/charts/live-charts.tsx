"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useLiveSeries, type LiveLine, type LiveRow } from "@/hooks/use-live-series";

export interface ChartLine extends LiveLine {
  label: string;
  color: string;
}

const GRID = "#1F2A40";
const MUTED = "#8A97AD";

type DotProps = { cx?: number; cy?: number; index?: number };

function lastDot(total: number, color: string, key: string) {
  function LastDot(p: DotProps) {
    if (p.index !== total - 1 || p.cx == null || p.cy == null) return <g key={`${key}-${p.index}`} />;
    return (
      <g key={`${key}-last`}>
        <circle cx={p.cx} cy={p.cy} r={9} fill={color} opacity={0.18}>
          <animate attributeName="r" values="5;12;5" dur="1.6s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.35;0;0.35" dur="1.6s" repeatCount="indefinite" />
        </circle>
        <circle cx={p.cx} cy={p.cy} r={4.5} fill={color} stroke="#0E1524" strokeWidth={2} />
      </g>
    );
  }
  return LastDot;
}

function ChartTooltip({
  active,
  payload,
  unit,
  lines,
  decimals = 0,
}: {
  active?: boolean;
  payload?: { dataKey?: string | number; value?: number }[];
  unit: string;
  lines: ChartLine[];
  decimals?: number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-surface/95 px-3 py-2 shadow-xl backdrop-blur">
      {payload.map((p) => {
        const l = lines.find((x) => x.key === p.dataKey);
        if (!l) return null;
        return (
          <div key={l.key} className="flex items-center gap-2 text-xs">
            <span className="size-2 rounded-full" style={{ background: l.color }} />
            <span className="text-muted">{l.label}</span>
            <span className="ml-auto pl-3 font-semibold tabular-nums">
              {Number(p.value).toFixed(decimals)} {unit}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function TimeAxis({ labels }: { labels: string[] }) {
  return (
    <div className="mt-1 flex justify-between pr-10 text-[10px] font-medium text-muted">
      {labels.map((l) => (
        <span key={l}>{l}</span>
      ))}
    </div>
  );
}

/** Varias líneas en tiempo real (ej. HR de la tripulación). */
export function LiveMultiChart({
  lines,
  min,
  max,
  unit,
  height = 240,
  points = 48,
  intervalMs = 1000,
  timeLabels = ["−48 s", "−36 s", "−24 s", "−12 s", "Ahora"],
}: {
  lines: ChartLine[];
  min: number;
  max: number;
  unit: string;
  height?: number;
  points?: number;
  intervalMs?: number;
  timeLabels?: string[];
}) {
  const data = useLiveSeries(lines, points, intervalMs);
  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} strokeDasharray="3 6" />
          <XAxis dataKey="t" hide />
          <YAxis domain={[min, max]} orientation="right" width={34} tick={{ fill: MUTED, fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip content={<ChartTooltip unit={unit} lines={lines} />} cursor={{ stroke: "#4F8CFF", strokeOpacity: 0.35 }} />
          {lines.map((l) => (
            <Line
              key={l.key}
              dataKey={l.key}
              type="monotone"
              stroke={l.color}
              strokeWidth={2.2}
              dot={lastDot(data.length, l.color, l.key)}
              activeDot={{ r: 4 }}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <TimeAxis labels={timeLabels} />
    </div>
  );
}

/** Una variable en tiempo real con área degradada. Devuelve el último valor por `onValue`. */
export function LiveAreaChart({
  line,
  min,
  max,
  unit,
  decimals = 0,
  height = 150,
  points = 40,
  intervalMs = 1000,
  threshold,
  children,
}: {
  line: ChartLine;
  min: number;
  max: number;
  unit: string;
  decimals?: number;
  height?: number;
  points?: number;
  intervalMs?: number;
  threshold?: number;
  children?: (latest: number, data: LiveRow[]) => React.ReactNode;
}) {
  const data = useLiveSeries([line], points, intervalMs);
  const latest = data[data.length - 1][line.key];
  const gid = `grad-${line.key}`;
  return (
    <div>
      {children?.(latest, data)}
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={line.color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={line.color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID} vertical={false} strokeDasharray="3 6" />
          <XAxis dataKey="t" hide />
          <YAxis domain={[min, max]} orientation="right" width={34} tick={{ fill: MUTED, fontSize: 10 }} axisLine={false} tickLine={false} />
          {threshold != null && (
            <ReferenceLine y={threshold} stroke="#EF4444" strokeDasharray="4 4" strokeOpacity={0.6} />
          )}
          <Tooltip content={<ChartTooltip unit={unit} lines={[line]} decimals={decimals} />} cursor={{ stroke: line.color, strokeOpacity: 0.35 }} />
          <Area
            dataKey={line.key}
            type="monotone"
            stroke={line.color}
            strokeWidth={2.2}
            fill={`url(#${gid})`}
            dot={lastDot(data.length, line.color, line.key)}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
      <TimeAxis labels={["−40 s", "−30 s", "−20 s", "−10 s", "Ahora"]} />
    </div>
  );
}

/** Gráfica histórica que se dibuja al aparecer. */
export function HistoryChart({
  data,
  lines,
  min,
  max,
  unit,
  height = 200,
  xKey = "label",
}: {
  data: Record<string, string | number>[];
  lines: { key: string; label: string; color: string; dashed?: boolean }[];
  min: number;
  max: number;
  unit: string;
  height?: number;
  xKey?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: 0 }}>
        <defs>
          {lines.map((l) => (
            <linearGradient key={l.key} id={`hist-${l.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={l.color} stopOpacity={l.dashed ? 0 : 0.3} />
              <stop offset="100%" stopColor={l.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid stroke={GRID} vertical={false} strokeDasharray="3 6" />
        <XAxis
          dataKey={xKey}
          tick={{ fill: MUTED, fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
          minTickGap={40}
        />
        <YAxis domain={[min, max]} orientation="right" width={34} tick={{ fill: MUTED, fontSize: 10 }} axisLine={false} tickLine={false} />
        <Tooltip
          content={<ChartTooltip unit={unit} lines={lines.map((l) => ({ ...l, base: 0, amp: 0, seed: "" }))} />}
          cursor={{ stroke: "#4F8CFF", strokeOpacity: 0.35 }}
        />
        {lines.map((l, i) => (
          <Area
            key={l.key}
            dataKey={l.key}
            type="monotone"
            stroke={l.color}
            strokeWidth={2}
            strokeDasharray={l.dashed ? "5 5" : undefined}
            fill={`url(#hist-${l.key})`}
            animationDuration={1400}
            animationBegin={i * 200}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
