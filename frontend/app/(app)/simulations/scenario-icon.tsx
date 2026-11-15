import { Activity, Droplet, Heart, Shield, Thermometer, Waves } from "lucide-react";
import type { Scenario } from "@/lib/types";

const MAP = { heart: Heart, droplet: Droplet, activity: Activity, waves: Waves, thermometer: Thermometer, shield: Shield };

export function ScenarioIcon({ icon, className }: { icon: Scenario["icon"]; className?: string }) {
  const Icon = MAP[icon];
  return <Icon className={className} />;
}
