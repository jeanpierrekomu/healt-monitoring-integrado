"use client";

import { HeartPulse, LogOut } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/primitives";
import { MOBILE_NAV, NAV_ITEMS } from "./nav-items";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5">
      <motion.span
        className="flex size-9 items-center justify-center rounded-[10px] bg-primary shadow-[0_8px_24px_-8px_rgb(79_140_255/0.9)]"
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 0.6, ease: "easeInOut" }}
      >
        <HeartPulse className="size-5 text-white" strokeWidth={2.2} />
      </motion.span>
      {!compact && (
        <span className="leading-tight">
          <span className="block text-[15px] font-bold">Healt Monitoring</span>
          <span className="block text-[11px] font-medium text-muted">Salud en el espacio</span>
        </span>
      )}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col border-r border-border bg-surface/80 px-4 pt-6 pb-5 backdrop-blur lg:flex">
      <div className="px-2">
        <Logo />
      </div>
      <nav className="mt-7 flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item, i) => {
          const active = pathname.startsWith(item.match);
          const Icon = item.icon;
          return (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.03 * i, duration: 0.35 }}
            >
              <Link
                href={item.href}
                className={cn(
                  "group relative flex h-10 items-center gap-3 rounded-lg px-3.5 text-sm transition-colors",
                  active ? "font-semibold text-fg" : "font-medium text-muted hover:bg-surface-2 hover:text-fg",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-lg bg-primary/15"
                    transition={{ type: "spring", stiffness: 400, damping: 34 }}
                  >
                    <span className="absolute top-2.5 left-0 h-5 w-[3px] rounded-full bg-primary" />
                  </motion.span>
                )}
                <Icon
                  className={cn("relative size-[18px] transition-transform group-hover:scale-110", active && "text-primary")}
                />
                <span className="relative">{item.label}</span>
              </Link>
            </motion.div>
          );
        })}
      </nav>
      <div className="flex items-center gap-2.5 rounded-xl bg-surface-2 p-3">
        <Avatar initials="DR" size={32} />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-[13px] font-semibold">Dra. Rivera</p>
          <p className="truncate text-[11px] text-muted">Médico de vuelo</p>
        </div>
        <Link href="/" title="Cambiar de rol" className="rounded-md p-1.5 text-muted transition-colors hover:bg-surface hover:text-fg">
          <LogOut className="size-4" />
        </Link>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((i) => MOBILE_NAV.includes(i.href));
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      {items.map((item) => {
        const active = pathname.startsWith(item.match);
        const Icon = item.icon;
        return (
          <Link key={item.href} href={item.href} className="relative flex flex-1 flex-col items-center gap-1 py-2.5">
            {active && (
              <motion.span layoutId="mnav-active" className="absolute top-0 h-0.5 w-10 rounded-full bg-primary" />
            )}
            <Icon className={cn("size-[22px]", active ? "text-primary" : "text-muted")} />
            <span className={cn("text-[10px]", active ? "font-semibold text-primary" : "font-medium text-muted")}>
              {item.label.replace("Laboratorio IA", "IA").replace("Monitorización", "Monitor")}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
