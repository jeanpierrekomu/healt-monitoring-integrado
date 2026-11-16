"use client";

// Marco del visor en Tierra: cabecera y menú de secciones del sistema de simulación.
import { Activity, Bell, Cpu, FlaskConical, History, LayoutDashboard, Radio, Repeat, Rocket, Satellite, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { LangToggle } from "@/components/i18n/translator";
import { HAS_SUPABASE } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/ground", label: "Panel", icon: LayoutDashboard, exact: true },
  { href: "/ground/astronauts", label: "Astronautas", icon: Users },
  { href: "/ground/missions", label: "Misiones", icon: Satellite },
  { href: "/ground/monitoring", label: "Monitorización", icon: Activity },
  { href: "/ground/alerts", label: "Alertas", icon: Bell },
  { href: "/ground/history", label: "Historial", icon: History },
  { href: "/ground/devices", label: "Dispositivos", icon: Cpu },
  { href: "/ground/simulation", label: "Simulación", icon: FlaskConical },
];

function CurrentNav() {
  return <GroundNav path={usePathname()} />;
}

function GroundNav({ path }: { path: string }) {
  return (
      <nav className="flex gap-1 overflow-x-auto border-b border-border px-3 py-2 lg:sticky lg:top-[57px] lg:h-[calc(100dvh-57px)] lg:w-52 lg:shrink-0 lg:flex-col lg:overflow-visible lg:border-r lg:border-b-0 lg:py-4">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const on = exact ? path === href : path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex h-9 shrink-0 items-center gap-2.5 rounded-md px-3 text-[13px] whitespace-nowrap transition-colors",
                on ? "bg-cyan-400/10 font-semibold text-cyan-300" : "text-muted hover:bg-surface hover:text-fg",
              )}
            >
              <Icon className="size-4" /> {label}
            </Link>
          );
        })}
      </nav>
  );
}

export function GroundShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-[#060a12]">
      <header className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-border bg-[#060a12]/95 px-4 py-2.5 backdrop-blur md:px-6">
        <span className="flex size-8 items-center justify-center rounded-md border border-cyan-400/40 bg-cyan-400/10 text-cyan-300">
          <Radio className="size-4" />
        </span>
        <div className="mr-auto leading-tight">
          <p className="text-[14px] font-bold">Healt Monitoring</p>
          <p className="font-mono text-[10px] tracking-[0.2em] text-cyan-300 uppercase">Visor en Tierra · Control de misión</p>
        </div>
        <span className={cn("hidden items-center gap-1.5 font-mono text-[11px] sm:flex", HAS_SUPABASE ? "text-normal" : "text-critico")}>
          <span className={cn("size-1.5 rounded-full", HAS_SUPABASE ? "bg-normal" : "bg-critico")} />
          {HAS_SUPABASE ? "Supabase conectado" : "Supabase sin configurar"}
        </span>
        <LangToggle />
        <Link href="/dashboard" className="flex h-9 items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-xs font-semibold text-muted hover:text-fg">
          <Rocket className="size-4" /> <span className="hidden md:inline">Ver como en el espacio</span>
        </Link>
        <Link href="/" className="flex h-9 items-center gap-1.5 rounded-md border border-cyan-400/40 bg-cyan-400/10 px-2.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-400/20">
          <Repeat className="size-4" /> <span className="hidden md:inline">Cambiar de rol</span>
        </Link>
      </header>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* El menú lee la ruta actual: Next exige envolverlo en Suspense en las páginas con identificador. */}
        <Suspense fallback={<GroundNav path="" />}>
          <CurrentNav />
        </Suspense>
        <main className="min-w-0 flex-1 px-4 py-5 md:px-6">{children}</main>
      </div>
    </div>
  );
}

export function PageTitle({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight md:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-[13px] text-muted">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}
