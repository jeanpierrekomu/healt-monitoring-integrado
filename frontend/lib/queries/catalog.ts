// Catálogo: agencias, astronautas, naves, dispositivos y misiones.
import { supabase } from "@/lib/supabase";
import type {
  Agency, Astronaut, AstronautProfile, DataSource, Device, HealthBaseline, Mission, MissionCrew, MissionSource, MissionSupportStaff, Spaceship,
} from "@/types/database";
import { one, rows } from "./core";

const LIMIT = 1000;

export const getAgencies = () => rows<Agency>(supabase().from("agencies").select("*").order("name").limit(LIMIT));
export const getAstronauts = () => rows<Astronaut>(supabase().from("astronauts").select("*").order("full_name").limit(LIMIT));
export const getAstronaut = (id: string) => one<Astronaut>(supabase().from("astronauts").select("*").eq("id", id).maybeSingle());
export const getProfile = (astronautId: string) =>
  one<AstronautProfile>(supabase().from("astronaut_profiles").select("*").eq("astronaut_id", astronautId).limit(1).maybeSingle());
export const getSpaceships = () => rows<Spaceship>(supabase().from("spaceships").select("*").order("name").limit(LIMIT));
export const getDevices = () => rows<Device>(supabase().from("devices").select("*").order("device_name").limit(LIMIT));
export const getMissions = () => rows<Mission>(supabase().from("missions").select("*").order("launch_date", { ascending: false, nullsFirst: false }).limit(LIMIT));
export const getMission = (id: string) => one<Mission>(supabase().from("missions").select("*").eq("id", id).maybeSingle());

export const getCrewOfMission = (missionId: string) => rows<MissionCrew>(supabase().from("mission_crew").select("*").eq("mission_id", missionId));
export const getMissionsOfAstronaut = (astronautId: string) => rows<MissionCrew>(supabase().from("mission_crew").select("*").eq("astronaut_id", astronautId));
export const getAllCrew = () => rows<MissionCrew>(supabase().from("mission_crew").select("*").limit(5000));
export const getSupportStaff = (missionId: string) => rows<MissionSupportStaff>(supabase().from("mission_support_staff").select("*").eq("mission_id", missionId));

export async function getMissionSources(missionId: string): Promise<DataSource[]> {
  const links = await rows<MissionSource>(supabase().from("mission_sources").select("*").eq("mission_id", missionId));
  const ids = links.map((l) => l.source_id).filter((x): x is string => Boolean(x));
  if (!ids.length) return [];
  return rows<DataSource>(supabase().from("data_sources").select("*").in("id", ids));
}

export const getBaselines = (astronautId: string) => rows<HealthBaseline>(supabase().from("health_baselines").select("*").eq("astronaut_id", astronautId).limit(50));
