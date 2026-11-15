import type { Metadata } from "next";
import { getAstronauts } from "@/services/astronauts";
import { bodyRef } from "@/services/body-mass";
import { CameraView } from "./camera-view";

export const metadata: Metadata = { title: "Masa corporal" };

export default async function CameraPage() {
  const astronauts = await getAstronauts();
  return <CameraView astronauts={astronauts.map((a) => ({ id: a.id, name: a.name, ...bodyRef(a.id, a.sex) }))} />;
}
