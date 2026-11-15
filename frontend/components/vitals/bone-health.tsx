"use client";

import { Bone, Dumbbell, Orbit, Waves } from "lucide-react";
import { motion } from "motion/react";
import dynamic from "next/dynamic";
import { HistoryChart } from "@/components/charts/live-charts";
import { AnimatedNumber, Progress } from "@/components/ui/animated";
import { Card, Pill, StatusBadge } from "@/components/ui/primitives";
import { STATUS_META } from "@/lib/utils";
import type { BoneHealth } from "@/services/bone";
import { BoneSites } from "./bone-sites";
import { UltrasoundFigure } from "./ultrasound-figure";

const BoneIcon3D = dynamic(() => import("@/components/three/bone-icon"), {
  ssr: false,
  loading: () => <div className="skeleton size-full rounded-xl" />,
});

/** Salud ósea medida con la pulsera: ultrasonido a lo largo del radio (experimental). */
export function BoneHealthCard({ bone, name }: { bone: BoneHealth; name: string }) {
  const color = STATUS_META[bone.status].hex;
  return (
    <Card className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="relative size-14 shrink-0 rounded-xl bg-surface-2/80" style={{ boxShadow: `inset 0 0 0 1px ${color}55, 0 0 22px -8px ${color}` }}>
          <BoneIcon3D glow={color} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-semibold">Salud ósea · ultrasonido del radio</h3>
          <p className="mt-0.5 text-xs text-muted">
            {name} · pulsera con transmisión axial · día {bone.missionDay} de misión
          </p>
        </div>
        <Pill tone="primary">Experimental</Pill>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        {/* Valores */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <p className="text-xs text-muted">Velocidad del sonido en el radio</p>
              <p className="text-[34px] leading-none font-bold">
                <AnimatedNumber value={bone.sos} />
                <span className="ml-1.5 text-sm font-medium text-muted">m/s</span>
              </p>
            </div>
            <div className="pb-1">
              <p className="text-xl font-bold" style={{ color }}>
                <AnimatedNumber value={bone.changePct} decimals={1} suffix=" %" />
              </p>
              <p className="text-[11px] text-muted">desde antes del vuelo ({bone.baselineSos.toLocaleString("es")} m/s)</p>
            </div>
            <StatusBadge status={bone.status} className="mb-1" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-surface-2/80 p-3">
              <p className="flex items-center gap-1.5 text-[11px] text-muted"><Bone className="size-3.5" /> Índice de salud ósea</p>
              <p className="mt-1 text-lg font-bold">
                <AnimatedNumber value={bone.index} />
                <span className="ml-1 text-xs font-medium text-muted">/ 100</span>
              </p>
              <Progress value={bone.index} className="mt-2 w-full" barClassName={bone.index >= 85 ? "bg-normal" : bone.index >= 70 ? "bg-atencion" : "bg-advertencia"} />
            </div>
            <div className="rounded-xl bg-surface-2/80 p-3">
              <p className="flex items-center gap-1.5 text-[11px] text-muted"><Orbit className="size-3.5" /> Al final de la misión</p>
              <p className="mt-1 text-lg font-bold" style={{ color }}>
                {bone.projectedEndPct.toFixed(1)} %
              </p>
              <p className="text-[11px] text-muted">si sigue a este ritmo</p>
            </div>
            <div className="rounded-xl bg-surface-2/80 p-3">
              <p className="flex items-center gap-1.5 text-[11px] text-muted"><Dumbbell className="size-3.5" /> Ejercicio de carga</p>
              <p className="mt-1 text-lg font-bold">{bone.exercisePct} %</p>
              <Progress value={Math.min(100, bone.exercisePct)} className="mt-2 w-full" barClassName={bone.exercisePct >= 90 ? "bg-normal" : bone.exercisePct >= 70 ? "bg-atencion" : "bg-advertencia"} />
            </div>
            <div className="rounded-xl bg-surface-2/80 p-3">
              <p className="flex items-center gap-1.5 text-[11px] text-muted"><Waves className="size-3.5" /> Contorno de muñeca</p>
              <p className="mt-1 text-lg font-bold">+{bone.wristPct.toFixed(1)} %</p>
              <p className="text-[11px] text-muted">fluidos y músculo, no hueso</p>
            </div>
          </div>

          <BoneSites bone={bone} />

          <div>
            <p className="mb-2 text-[11px] font-semibold tracking-wider text-muted">QUÉ PESA MÁS EN LA ESTIMACIÓN</p>
            <div className="flex flex-col gap-2">
              {bone.factors.map((f, i) => (
                <div key={f.label}>
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold">{f.label}</span>
                    <span className="text-muted">
                      {f.detail} · <span className="font-semibold text-primary">{Math.round(f.weight * 100)} %</span>
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-[#8ab4ff]"
                      initial={{ width: 0 }}
                      animate={{ width: `${f.weight * 100}%` }}
                      transition={{ delay: 0.1 + i * 0.08, duration: 0.7 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Figura + gráfica */}
        <div className="flex flex-col gap-5">
          <UltrasoundFigure sos={bone.sos} color={color} />
          <div>
            <div className="mb-1 flex items-center justify-between">
              <p className="text-[13px] font-semibold">Cambio de la SOS por día de misión</p>
              <div className="flex gap-3 text-xs text-muted">
                <span className="flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: color }} />Medido</span>
                <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-muted" />Esperado</span>
              </div>
            </div>
            <HistoryChart
              data={bone.history}
              unit="%"
              min={Math.min(-2.5, Math.floor(bone.changePct - 0.5))}
              max={0.5}
              height={170}
              lines={[
                { key: "esperado", label: "Esperado", color: "#8A97AD", dashed: true },
                { key: "medido", label: "Medido", color },
              ]}
            />
          </div>
        </div>
      </div>

      <p className="rounded-xl border border-dashed border-border px-4 py-3 text-[11px] leading-relaxed text-muted">
        Concepto de prototipo: hoy no existe una pulsera que mida el hueso. La SOS del radio, el ejercicio y los días en microgravedad se combinan en un
        índice estimado. La pérdida ósea en el espacio es mayor en cadera, columna y piernas; el radio cambia poco, por eso se usa como indicador de tendencia.
        Datos de ejemplo.
      </p>
    </Card>
  );
}
