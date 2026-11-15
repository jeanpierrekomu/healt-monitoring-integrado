import type { Astronaut } from "@/lib/types";
import { backendAstronauts } from "./backend";
import { astronauts } from "./mock/data";

/** Tripulación real del backend; si no está disponible, la de ejemplo. */
export async function getAstronauts(): Promise<Astronaut[]> {
  return (await backendAstronauts()) ?? astronauts;
}

export async function getAstronaut(id: string): Promise<Astronaut | null> {
  return (await getAstronauts()).find((a) => a.id === id) ?? null;
}
