import type { Metadata } from "next";
import { Suspense } from "react";
import { Loading } from "@/components/ground/ui";
import { MonitoringView } from "@/components/ground/views/monitoring";

export const metadata: Metadata = { title: "Monitorización · Visor en Tierra" };
export default function Page() {
  return (
    <Suspense fallback={<Loading rows={6} />}>
      <MonitoringView />
    </Suspense>
  );
}
