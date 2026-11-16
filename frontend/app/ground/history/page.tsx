import type { Metadata } from "next";
import { HistoryView } from "@/components/ground/views/history";

export const metadata: Metadata = { title: "Historial · Visor en Tierra" };
export default function Page() {
  return <HistoryView />;
}
