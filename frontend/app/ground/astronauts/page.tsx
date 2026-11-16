import type { Metadata } from "next";
import { AstronautsView } from "@/components/ground/views/astronauts";

export const metadata: Metadata = { title: "Astronautas · Visor en Tierra" };
export default function Page() {
  return <AstronautsView />;
}
