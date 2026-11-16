import type { Metadata } from "next";
import { HardwareView } from "@/components/ground/views/hardware";

export const metadata: Metadata = { title: "Hardware · Visor en Tierra" };
export default function Page() {
  return <HardwareView />;
}
