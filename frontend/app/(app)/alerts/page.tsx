import type { Metadata } from "next";
import { getAlerts } from "@/services/alerts";
import { getAstronauts } from "@/services/astronauts";
import { AlertsView } from "./alerts-view";

export const metadata: Metadata = { title: "Alertas" };

export default async function AlertsPage() {
  const [alerts, astronauts] = await Promise.all([getAlerts(), getAstronauts()]);
  return <AlertsView initialAlerts={alerts} astronauts={astronauts} />;
}
