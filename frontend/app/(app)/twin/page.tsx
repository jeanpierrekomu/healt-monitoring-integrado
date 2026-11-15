import type { Metadata } from "next";
import { getAstronauts } from "@/services/astronauts";
import { TwinView } from "./twin-view";

export const metadata: Metadata = { title: "Gemelo muscular" };

export default async function TwinPage() {
  const astronauts = await getAstronauts();
  return <TwinView astronauts={astronauts.map((a) => ({ id: a.id, name: a.name, role: a.role }))} />;
}
