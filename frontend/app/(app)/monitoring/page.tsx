import type { Metadata } from "next";
import { Suspense } from "react";
import { getAstronauts } from "@/services/astronauts";
import { getVitalConfigs } from "@/services/readings";
import { MonitoringView } from "./monitoring-view";

export const metadata: Metadata = { title: "Monitorización" };

export default async function MonitoringPage() {
  const astronauts = await getAstronauts();
  return (
    <Suspense fallback={<div className="skeleton h-[520px] rounded-2xl" />}>
      <MonitoringView astronauts={astronauts} configs={getVitalConfigs()} />
    </Suspense>
  );
}
