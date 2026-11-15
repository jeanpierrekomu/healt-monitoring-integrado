import type { Metadata } from "next";
import { getMissions } from "@/services/missions";
import { MissionsView } from "./missions-view";

export const metadata: Metadata = { title: "Misiones" };

export default async function MissionsPage() {
  return <MissionsView missions={await getMissions()} />;
}
