import type { Metadata } from "next";
import { Suspense } from "react";
import { Loading } from "@/components/ground/ui";
import { SimulationView } from "@/components/ground/views/simulation";

export const metadata: Metadata = { title: "Simulación · Visor en Tierra" };
export default function Page() {
  return (
    <Suspense fallback={<Loading rows={6} />}>
      <SimulationView />
    </Suspense>
  );
}
