import type { Metadata } from "next";
import { DashboardView } from "@/components/ground/views/dashboard";

export const metadata: Metadata = { title: "Visor en Tierra" };

export default function GroundDashboardPage() {
  return <DashboardView />;
}
