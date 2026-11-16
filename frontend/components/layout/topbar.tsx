"use client";

import { Bell, Search, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MissionClock } from "@/components/ui/animated";
import { StatusBadge } from "@/components/ui/primitives";
import type { Status } from "@/lib/types";
import { Logo } from "./sidebar";
import { VoiceToggle } from "@/components/alerts/alert-popup";
import { AmbienceControl } from "@/components/ambience/ambience-control";
import { LangToggle } from "@/components/i18n/translator";

export interface NotificationItem {
  id: string;
  title: string;
  firstName: string;
  value: string;
  source: string;
  severity: Status;
  ago: string;
}

function Notifications({ items: unread }: { items: NotificationItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => setOpen((o) => !o)}
        aria-label="Notificaciones"
        className="relative flex size-10 items-center justify-center rounded-xl border border-border bg-surface transition-colors hover:border-primary/50"
      >
        <motion.span
          animate={{ rotate: [0, -14, 12, -8, 6, 0] }}
          transition={{ duration: 0.9, repeat: Infinity, repeatDelay: 5 }}
        >
          <Bell className="size-[18px] text-muted" />
        </motion.span>
        <span className="absolute top-2 right-2 flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-critico opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-critico" />
        </span>
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            style={{ transformOrigin: "top right" }}
            className="absolute top-12 right-0 z-50 w-[360px] max-w-[calc(100vw-32px)] overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl shadow-black/60"
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-3">
              <p className="text-[15px] font-bold">Notificaciones</p>
              <button onClick={() => setOpen(false)} className="rounded-md p-1 text-muted hover:text-fg">
                <X className="size-4" />
              </button>
            </div>
            <ul>
              {unread.map((a, i) => {
                return (
                  <motion.li
                    key={a.id}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * i }}
                    className="flex items-start gap-3 border-t border-border bg-primary/5 px-5 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold">
                        {a.title} · {a.firstName}
                      </p>
                      <p className="text-xs text-muted">
                        {a.value} · {a.source}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <StatusBadge status={a.severity} />
                      <span className="text-[11px] text-muted">{a.ago}</span>
                    </div>
                  </motion.li>
                );
              })}
            </ul>
            <Link
              href="/alerts"
              onClick={() => setOpen(false)}
              className="block border-t border-border py-3 text-center text-[13px] font-semibold text-primary hover:bg-surface-2"
            >
              Ver todas las alertas →
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Topbar({ notifications }: { notifications: NotificationItem[] }) {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border/60 bg-bg/70 px-4 py-3 backdrop-blur-xl md:px-8">
      <div className="lg:hidden">
        <Logo compact />
      </div>
      <label className="flex h-10 flex-1 items-center gap-2.5 rounded-xl border border-border bg-surface px-3.5 transition-colors focus-within:border-primary/60 md:max-w-sm">
        <Search className="size-4 text-muted" />
        <input
          placeholder="Buscar astronauta, alerta…"
          className="w-full bg-transparent text-[13px] outline-none placeholder:text-muted"
        />
      </label>
      <div className="ml-auto hidden items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs text-muted md:flex">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-normal opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-normal" />
        </span>
        Artemis-H · día 42 · <MissionClock />
      </div>
      <LangToggle />
      <AmbienceControl />
      <VoiceToggle />
      <Notifications items={notifications} />
    </header>
  );
}
