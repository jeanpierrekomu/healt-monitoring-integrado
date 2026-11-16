import type { Metadata } from "next";
import { AlertsView } from "@/components/ground/views/alerts";

export const metadata: Metadata = { title: "Alertas · Visor en Tierra" };
export default function Page() {
  return <AlertsView />;
}
