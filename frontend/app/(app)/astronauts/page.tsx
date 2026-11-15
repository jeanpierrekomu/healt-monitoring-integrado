import type { Metadata } from "next";
import { getAstronauts } from "@/services/astronauts";
import { AstronautsView } from "./astronauts-view";

export const metadata: Metadata = { title: "Astronautas" };

export default async function AstronautsPage() {
  return <AstronautsView astronauts={await getAstronauts()} />;
}
