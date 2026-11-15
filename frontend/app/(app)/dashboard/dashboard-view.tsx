"use client";

import { ArrowRight, Bell, Droplet, Heart, Moon, Siren, Users } from "lucide-react";
import { motion } from "motion/react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AstronautCard } from "@/components/astronauts/astronaut-card";
import { LiveMultiChart } from "@/components/charts/live-charts";
import { PageHeader } from "@/components/ui/animated";
import { Stagger, StaggerItem } from "@/components/ui/motion";
import { Card, CardTitle, LiveBadge, StatusBadge } from "@/components/ui/primitives";
import { StatCard } from "@/components/ui/stat-card";
import { useSleepContext } from "@/components/sleep/sleep-context";
import { CrewRest } from "@/components/sleep/sleep-ui";
import { useAlertPopup } from "@/components/alerts/alert-popup-context";
import type { Astronaut, HealthAlert } from "@/lib/types";
import { STATUS_META } from "@/lib/utils";

const MissionScene = dynamic(() => import("@/components/three/mission-scene"), {
  ssr: false,
  loading: () => <div className="skeleton absolute inset-0 opacity-30" />,
});

export function DashboardView({ astronauts, alerts }: { astronauts: Astronaut[]; alerts: HealthAlert[] }) {
  const router = useRouter();
  const sleep = useSleepContext();
  const { runDemo } = useAlertPopup();
  const open = alerts.filter((a) => a.review !== "resuelta");
  const avg = (k: "hr" | "spo2") => astronauts.reduce((s, a) => s + sleep.adjust(a)[k], 0) / astronauts.length;
  const asleep = astronauts.filter((a) => sleep.isSleeping(a.id)).length;
  const crew = astronauts.slice(0, 3); // los tres primeros tripulantes en la gráfica de pulso
  const name = (id: string) => astronauts.find((a) => a.id === id)?.name ?? id;
  const tracked = crew.map((a) => ({
    key: a.id,
    label: a.name.split(" ")[0],
    color: STATUS_META[a.status === "normal" ? "normal" : a.status].hex,
    base: sleep.adjust(a).hr,
    amp: a.status === "critico" ? 3.4 : 2,
    seed: a.id + "hr",
  }));
  if (tracked[0]) tracked[0].color = "#4F8CFF";

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={`Misión Artemis-H · Día 42 de 180 · ${astronauts.length} tripulantes en órbita`}
        actions={
          <button
            type="button"
            onClick={runDemo}
            className="flex items-center gap-2 rounded-xl border border-critico/50 bg-critico/10 px-3.5 py-2 text-[13px] font-semibold text-critico transition-colors hover:bg-critico/20"
          >
            <Siren className="size-4" /> Probar alertas
          </button>
        }
      />

      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
        <Card className="relative h-[340px] overflow-hidden p-0 md:h-[400px]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_50%,rgb(79_140_255/0.14),transparent_60%)]" />
          <MissionScene
            crew={astronauts.map((a) => ({ id: a.id, name: a.name, initials: a.initials, status: a.status }))}
            onSelect={(id) => router.push(`/astronauts/${id}`)}
          />
          <div className="pointer-events-none absolute top-5 left-5 max-w-sm">
            <p className="text-[11px] font-semibold tracking-wider text-primary">CENTRO DE MISIÓN</p>
            <p className="mt-1 text-xl font-bold">Artemis-H · órbita lunar</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              La estación Gateway orbita la Luna a ~384 400 km de la Tierra. Cada luz es un tripulante: su color muestra su estado de salud.
            </p>
          </div>
          <div className="absolute right-5 bottom-5 left-5 flex flex-wrap gap-2">
            {astronauts.map((a) => (
              <Link
                key={a.id}
                href={`/astronauts/${a.id}`}
                className="flex items-center gap-1.5 rounded-full border border-border bg-surface/80 px-2.5 py-1 text-xs backdrop-blur transition-colors hover:border-primary/60"
              >
                <span className={`size-2 rounded-full ${STATUS_META[a.status].dot} ${a.status === "critico" ? "animate-pulse" : ""}`} />
                {a.name.split(" ")[0]}
              </Link>
            ))}
          </div>
        </Card>
      </motion.div>

      <Stagger className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        <StaggerItem>
          <StatCard icon={Users} title="Astronautas activos" value={astronauts.length} detail="Misión Artemis-H · día 42" href="/astronauts" />
        </StaggerItem>
        <StaggerItem>
          <StatCard icon={Bell} title="Alertas abiertas" value={open.length} detail={`${open.filter((a) => a.severity === "critico").length} crítica · ${open.filter((a) => a.severity === "advertencia").length} advertencias · ${open.filter((a) => a.severity === "atencion").length} atención`} href="/alerts" tone="text-critico" />
        </StaggerItem>
        <StaggerItem>
          <StatCard icon={Heart} title="HR promedio" value={avg("hr")} suffix=" lpm" detail="Tripulación · en vivo" live={{ amp: 0.8, interval: 2000 }} info="hr" />
        </StaggerItem>
        <StaggerItem>
          <StatCard icon={Droplet} title="SpO₂ promedio" value={avg("spo2")} decimals={1} suffix=" %" detail="Rango normal 96–100 %" live={{ amp: 0.15, interval: 3000 }} info="spo2" />
        </StaggerItem>
      </Stagger>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.5 }}>
        <Card>
          <CardTitle
            title="Descanso de la tripulación"
            subtitle="La pulsera detecta el sueño (pulso en descenso, sin movimiento, piel más fría) y los datos cambian solos"
            right={
              <span className="flex items-center gap-1.5 rounded-full bg-[#8b7bff]/15 px-2.5 py-1 text-xs font-semibold text-[#c9c1ff]">
                <Moon className="size-3.5" /> {asleep} de {astronauts.length} durmiendo
              </span>
            }
          />
          <CrewRest astronauts={astronauts} />
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <motion.div
          className="xl:col-span-2"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <Card className="h-full">
            <CardTitle
              title="Frecuencia cardiaca (HR)"
              subtitle="Tiempo real · lpm · actualización cada segundo"
              right={
                <div className="flex flex-wrap items-center justify-end gap-3">
                  <LiveBadge />
                  {tracked.map((l) => (
                    <span key={l.key} className="flex items-center gap-1.5 text-xs text-muted">
                      <span className="size-2 rounded-full" style={{ background: l.color }} />
                      {l.label}
                    </span>
                  ))}
                </div>
              }
            />
            <LiveMultiChart lines={tracked} min={50} max={140} unit="lpm" height={250} />
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28, duration: 0.5 }}>
          <Card className="h-full">
            <CardTitle
              title="Alertas recientes"
              right={
                <Link href="/alerts" className="text-xs font-semibold text-primary hover:underline">
                  Ver todas
                </Link>
              }
            />
            <Stagger className="flex flex-col">
              {alerts.slice(0, 4).map((a) => (
                <StaggerItem key={a.id}>
                  <Link
                    href={`/astronauts/${a.astronautId}`}
                    className="-mx-2 flex items-center gap-3 rounded-lg border-t border-border px-2 py-3 transition-colors hover:bg-surface-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold">
                        {a.title} · {a.value}
                      </p>
                      <p className="truncate text-[11px] text-muted">
                        {name(a.astronautId)} · {a.ago}
                      </p>
                    </div>
                    <StatusBadge status={a.review === "resuelta" ? "normal" : a.severity} label={a.review === "resuelta" ? "Resuelta" : undefined} />
                  </Link>
                </StaggerItem>
              ))}
            </Stagger>
          </Card>
        </motion.div>
      </div>

      <section className="flex flex-col gap-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-[17px] font-semibold">Tripulación</h2>
          <Link href="/astronauts" className="group flex items-center gap-1 text-xs font-semibold text-primary">
            Ver los {astronauts.length} astronautas
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
        <Stagger className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {crew.map((a) => (
            <StaggerItem key={a.id}>
              <AstronautCard astronaut={a} />
            </StaggerItem>
          ))}
        </Stagger>
      </section>
    </>
  );
}
