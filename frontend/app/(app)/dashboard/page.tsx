import type { Metadata } from "next";
import { getAlerts } from "@/services/alerts";
import { getAstronauts } from "@/services/astronauts";
import { DashboardView } from "./dashboard-view";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const [astronauts, alerts] = await Promise.all([getAstronauts(), getAlerts()]);
  return <DashboardView astronauts={astronauts} alerts={alerts} />;
}
