import type { Scenario } from "@/lib/types";
import { apiGet, USE_MOCK } from "./api";
import { scenarios } from "./mock/data";

export async function getScenarios(): Promise<Scenario[]> {
  if (USE_MOCK) return scenarios;
  return apiGet<Scenario[]>("/simulations/scenarios");
}

export async function getScenario(id: string): Promise<Scenario | null> {
  if (USE_MOCK) return scenarios.find((s) => s.id === id) ?? null;
  return apiGet<Scenario>(`/simulations/scenarios/${id}`);
}
