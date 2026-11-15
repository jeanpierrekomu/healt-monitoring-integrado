import type { Metadata } from "next";
import { getAstronauts } from "@/services/astronauts";
import { LiveView } from "./live-view";

export const metadata: Metadata = { title: "Medición en vivo" };

export default async function LivePage() {
  const astronauts = await getAstronauts();
  return <LiveView astronauts={astronauts.map((a) => ({ id: a.id, name: a.name, baseline: a.baseline }))} />;
}
