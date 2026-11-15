"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AnimatedNumber, Progress } from "@/components/ui/animated";
import { Stagger, StaggerItem } from "@/components/ui/motion";
import { Card, CardTitle, Pill } from "@/components/ui/primitives";

import { EVAL_BY_SCENARIO as BY_SCENARIO, EVAL_METRICS as METRICS, EVAL_VERSIONS as VERSIONS } from "@/services/ai";

export default function EvaluationPage() {
  return (
    <div className="flex flex-col gap-6">
      <Stagger className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {METRICS.map((m) => (
          <StaggerItem key={m.label}>
            <Card className="glow-hover h-full">
              <p className="text-[13px] font-medium text-muted">{m.label}</p>
              <p className="mt-2 text-[30px] leading-none font-bold">
                <AnimatedNumber value={m.value} decimals={m.decimals} suffix={m.suffix} duration={1.2} />
              </p>
              <Progress value={m.decimals ? m.value * 100 : m.value} className="mt-3 w-full" barClassName="bg-normal" delay={0.2} />
              <p className="mt-2 text-[11px] text-muted">{m.hint}</p>
            </Card>
          </StaggerItem>
        ))}
      </Stagger>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card>
          <CardTitle title="Tiempo hasta la detección" subtitle="Minutos desde el inicio del evento · IA vs. doctor (simulaciones)" />
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={BY_SCENARIO} margin={{ top: 10, right: 8, left: -16, bottom: 0 }} barGap={6}>
              <CartesianGrid stroke="#1F2A40" vertical={false} strokeDasharray="3 6" />
              <XAxis dataKey="name" tick={{ fill: "#8A97AD", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#8A97AD", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: "rgb(79 140 255 / 0.06)" }}
                contentStyle={{ background: "#0E1524", border: "1px solid #1F2A40", borderRadius: 12, fontSize: 12 }}
                labelStyle={{ color: "#E6EDF7", fontWeight: 600 }}
                formatter={(v) => [`${v} min`]}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: "#8A97AD" }} iconType="circle" iconSize={8} />
              <Bar dataKey="ia" name="Modelo IA" fill="#4F8CFF" radius={[6, 6, 0, 0]} animationDuration={1200} />
              <Bar dataKey="doctor" name="Doctor" fill="#22C55E" radius={[6, 6, 0, 0]} animationDuration={1200} animationBegin={250} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <CardTitle title="Versiones del modelo" />
          <Stagger className="flex flex-col">
            {VERSIONS.map((v) => (
              <StaggerItem key={v.v} className="flex items-center gap-3 border-t border-border py-3">
                <span className="font-mono text-[13px] font-semibold">{v.v}</span>
                <div className="flex-1">
                  <p className="text-[13px]">{v.note}</p>
                  <p className="text-[11px] text-muted">{v.date}</p>
                </div>
                <span className="text-[13px] font-bold">{v.acc} %</span>
                {v.current && <Pill tone="primary">Actual</Pill>}
              </StaggerItem>
            ))}
          </Stagger>
        </Card>
      </div>
    </div>
  );
}
