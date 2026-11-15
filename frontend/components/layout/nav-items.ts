import {
  Activity,
  Bell,
  BookOpen,
  PersonStanding,
  Cpu,
  FlaskConical,
  LayoutDashboard,
  Radio,
  Rocket,
  Shield,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react";

export const NAV_ITEMS: { href: string; label: string; icon: LucideIcon; match: string }[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, match: "/dashboard" },
  { href: "/astronauts", label: "Astronautas", icon: Users, match: "/astronauts" },
  { href: "/missions", label: "Misiones", icon: Rocket, match: "/missions" },
  { href: "/monitoring", label: "Monitorización", icon: Activity, match: "/monitoring" },
  { href: "/live", label: "Medición en vivo", icon: Radio, match: "/live" },
  { href: "/camera", label: "Masa corporal", icon: Video, match: "/camera" },
  { href: "/twin", label: "Gemelo muscular", icon: PersonStanding, match: "/twin" },
  { href: "/alerts", label: "Alertas", icon: Bell, match: "/alerts" },
  { href: "/ai/vision", label: "Laboratorio IA", icon: Cpu, match: "/ai" },
  { href: "/simulations", label: "Simulaciones", icon: FlaskConical, match: "/simulations" },
  { href: "/documentation", label: "Documentación", icon: BookOpen, match: "/documentation" },
  { href: "/admin", label: "Admin", icon: Shield, match: "/admin" },
];

export const MOBILE_NAV = ["/dashboard", "/astronauts", "/monitoring", "/alerts", "/ai/vision"];
