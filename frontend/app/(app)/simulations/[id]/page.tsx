import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getScenario, getScenarios } from "@/services/simulations";
import { SimulationRunner } from "./simulation-runner";

export async function generateStaticParams() {
  return (await getScenarios()).map((s) => ({ id: s.id }));
}

export async function generateMetadata(props: PageProps<"/simulations/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  return { title: (await getScenario(id))?.name ?? "Simulación" };
}

export default async function SimulationPage(props: PageProps<"/simulations/[id]">) {
  const { id } = await props.params;
  const scenario = await getScenario(id);
  if (!scenario) notFound();
  return <SimulationRunner scenario={scenario} />;
}
