import type { Metadata } from "next";
import { getScenarios } from "@/services/simulations";
import { SimulationsView } from "./simulations-view";

export const metadata: Metadata = { title: "Simulaciones" };

export default async function SimulationsPage() {
  return <SimulationsView scenarios={await getScenarios()} />;
}
