"use client";

import { ChevronLeft, Download, Droplet, Heart, Thermometer, Waves } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { HistoryChart } from "@/components/charts/live-charts";
import { PageHeader } from "@/components/ui/animated";
import { Stagger, StaggerItem } from "@/components/ui/motion";
import { Avatar, Button, ButtonLink, Card, CardTitle, StatusBadge } from "@/components/ui/primitives";
import { StatCard } from "@/components/ui/stat-card";
import { BodyExplorer } from "@/components/vitals/body-explorer";
import { HeartMonitor } from "@/components/vitals/heart-monitor";
import { useSleep } from "@/components/sleep/sleep-context";
import { SEX_LABEL } from "@/services/education";
import { BoneHealthCard } from "@/components/vitals/bone-health";
import type { BoneHealth } from "@/services/bone";
import type { Astronaut, HealthAlert } from "@/lib/types";
import { STATUS_META } from "@/lib/utils";

export function ProfileView({
  astronaut: a,
  alerts,
  week,
  bone,
}: {
  astronaut: Astronaut;
  alerts: HealthAlert[];
  week: { label: string; hr: number; ref: number }[];
  bone: BoneHealth | null;
}) {
  const { vitals: sleepVitals } = useSleep(a);
  const info: [string, string][] = [
    ["Agencia", a.agency],
    ["Procedencia", a.origin],
    ["Edad", `${a.age} años`],
    ["Sexo (rangos de referencia)", SEX_LABEL[a.sex]],
    ["Su normal en reposo", `${a.baseline.hr} lpm · ${a.baseline.temp} °C · HRV ${a.baseline.hrv} ms`],
    ["Misiones previas", a.previousMissions.join(" · ")],
    ["Horas de EVA", `${a.evaHours} h`],
    ["Grupo sanguíneo", a.bloodType],
    ["Fuente del perfil", a.profileSource],
  ];
  const hrColor = a.status === "normal" ? "#4F8CFF" : STATUS_META[a.status].hex;

  return (
    <>
      <Link href="/astronauts" className="group -mb-3 flex w-fit items-center gap-1 text-xs font-semibold text-muted hover:text-fg">
        <ChevronLeft className="size-4 transition-transform group-hover:-translate-x-0.5" /> Astronautas
      </Link>
      <PageHeader title={a.name} subtitle="Perfil · información pública y estado de salud" />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_1fr]">
        <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
          <Card className="flex h-full flex-col gap-4">
            <div className="flex flex-col items-center gap-2 py-2 text-center">
              <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}>
                <Avatar initials={a.initials} size={80} className="ring-4" />
              </motion.div>
              <p className="mt-1 text-xl font-bold">{a.name}</p>
              <p className="text-[13px] text-muted">
                {a.role} · {a.agency}
              </p>
              <StatusBadge status={a.status} />
            </div>
            <div className="h-px bg-border" />
            <p className="text-[11px] font-semibold tracking-wider text-muted">INFORMACIÓN PÚBLICA</p>
            <Stagger className="flex flex-col gap-2.5">
              {info.map(([k, v]) => (
                <StaggerItem key={k} className="flex justify-between gap-3 text-[13px]">
                  <span className="text-muted">{k}</span>
                  <span className="text-right font-semibold">{v}</span>
                </StaggerItem>
              ))}
            </Stagger>
            <div className="mt-auto flex flex-col gap-2.5 pt-2">
              <ButtonLink href={`/monitoring?astronaut=${a.id}`}>Ver monitorización</ButtonLink>
              <Button variant="secondary">
                <Download className="size-4" /> Exportar informe
              </Button>
            </div>
          </Card>
        </motion.div>

        <div className="flex min-w-0 flex-col gap-6">
          <Stagger className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StaggerItem><StatCard icon={Heart} title="HR" value={a.vitals.hr} suffix=" lpm" live={{ amp: 1.5, interval: 1500 }} tone={STATUS_META[a.status].text} info="hr" /></StaggerItem>
            <StaggerItem><StatCard icon={Waves} title="HRV" value={a.vitals.hrv} suffix=" ms" live={{ amp: 1.2, interval: 2500 }} info="hrv" /></StaggerItem>
            <StaggerItem><StatCard icon={Droplet} title="SpO₂" value={a.vitals.spo2} suffix=" %" live={{ amp: 0.25, interval: 3000 }} info="spo2" /></StaggerItem>
            <StaggerItem><StatCard icon={Thermometer} title="Temp" value={a.vitals.temp} decimals={1} suffix=" °C" live={{ amp: 0.03, interval: 4000 }} info="temp" /></StaggerItem>
          </Stagger>

          <Card>
            <CardTitle
              title="Evolución de los últimos 7 días"
              subtitle="HR promedio (lpm) frente a la referencia de la tripulación"
              right={
                <div className="flex gap-3 text-xs text-muted">
                  <span className="flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: hrColor }} />HR</span>
                  <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-muted" />Referencia</span>
                </div>
              }
            />
            <HistoryChart
              data={week}
              unit="lpm"
              min={50}
              max={130}
              height={210}
              lines={[
                { key: "ref", label: "Referencia", color: "#8A97AD", dashed: true },
                { key: "hr", label: "HR", color: hrColor },
              ]}
            />
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardTitle title="Alertas recientes" />
              {alerts.length === 0 && <p className="text-[13px] text-muted">Sin alertas registradas.</p>}
              <Stagger className="flex flex-col">
                {alerts.map((al) => (
                  <StaggerItem key={al.id} className="flex items-center gap-3 border-t border-border py-3">
                    <div className="flex-1">
                      <p className="text-[13px] font-semibold">{al.title} · {al.value}</p>
                      <p className="text-[11px] text-muted">{al.time} · {al.source}</p>
                    </div>
                    <StatusBadge status={al.severity} />
                  </StaggerItem>
                ))}
              </Stagger>
            </Card>
            <Card className="flex flex-col">
              <CardTitle title="Notas médicas" />
              <p className="text-[13px] leading-relaxed text-muted">{a.notes}</p>
              <div className="mt-auto flex items-center gap-2 pt-4 text-xs text-muted">
                <Avatar initials="DR" size={24} /> Dra. Rivera · hoy 14:40
              </div>
            </Card>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <BodyExplorer astronaut={{ ...a, vitals: sleepVitals }} />
        <HeartMonitor astronaut={a} baseHr={sleepVitals.hr} />
      </div>

      {bone && <BoneHealthCard bone={bone} name={a.name} />}
    </>
  );
}
