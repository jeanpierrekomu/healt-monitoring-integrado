import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAlertsByAstronaut } from "@/services/alerts";
import { getBoneHealth } from "@/services/bone";
import { getAstronaut, getAstronauts } from "@/services/astronauts";
import { weeklySeries } from "@/services/readings";
import { ProfileView } from "./profile-view";

export async function generateStaticParams() {
  return (await getAstronauts()).map((a) => ({ id: a.id }));
}

export async function generateMetadata(props: PageProps<"/astronauts/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const a = await getAstronaut(id);
  return { title: a?.name ?? "Astronauta" };
}

export default async function AstronautPage(props: PageProps<"/astronauts/[id]">) {
  const { id } = await props.params;
  const astronaut = await getAstronaut(id);
  if (!astronaut) notFound();
  const [alerts, bone] = await Promise.all([getAlertsByAstronaut(id), getBoneHealth(id)]);
  return <ProfileView astronaut={astronaut} alerts={alerts} week={weeklySeries(astronaut)} bone={bone} />;
}
