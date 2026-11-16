import type { Metadata } from "next";
import { MissionsView } from "@/components/ground/views/missions";

export const metadata: Metadata = { title: "Misiones · Visor en Tierra" };
export default function Page() {
  return <MissionsView />;
}
