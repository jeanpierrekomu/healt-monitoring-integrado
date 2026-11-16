import type { Metadata } from "next";
import { DevicesView } from "@/components/ground/views/devices";

export const metadata: Metadata = { title: "Dispositivos · Visor en Tierra" };
export default function Page() {
  return <DevicesView />;
}
