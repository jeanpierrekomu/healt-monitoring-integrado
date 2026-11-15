"use client";

import { animate, motion, useInView } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** Número que cuenta hasta su valor y se anima cada vez que cambia. */
export function AnimatedNumber({
  value,
  decimals = 0,
  suffix = "",
  className,
  duration = 0.9,
}: {
  value: number;
  decimals?: number;
  suffix?: string;
  className?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const from = useRef(0);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView || !ref.current) return;
    const node = ref.current;
    const controls = animate(from.current, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        node.textContent = v.toFixed(decimals) + suffix;
      },
    });
    from.current = value;
    return () => controls.stop();
  }, [value, decimals, suffix, duration, inView]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {(0).toFixed(decimals) + suffix}
    </span>
  );
}

/** Barra de progreso que se llena con animación. */
export function Progress({
  value,
  className,
  barClassName = "bg-primary",
  delay = 0,
}: {
  value: number;
  className?: string;
  barClassName?: string;
  delay?: number;
}) {
  return (
    <div className={cn("h-1.5 shrink-0 overflow-hidden rounded-full bg-surface-2", className ?? "w-full")}>
      <motion.div
        className={cn("h-full rounded-full", barClassName)}
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        transition={{ duration: 1, delay, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  );
}

/** Grupo de chips con una píldora que se desliza hasta la opción activa. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  id,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  id: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors",
              active ? "border-primary/60 text-fg" : "border-border text-muted hover:text-fg",
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-full bg-primary/15"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Pestañas de navegación con subrayado animado. */
export function TabsNav({ items, id }: { items: { href: string; label: string }[]; id: string }) {
  const pathname = usePathname();
  return (
    <div className="flex gap-7 border-b border-border">
      {items.map((it) => {
        const active = pathname === it.href;
        return (
          <Link
            key={it.href}
            href={it.href}
            className={cn("relative pb-3 text-sm transition-colors", active ? "font-semibold text-fg" : "font-medium text-muted hover:text-fg")}
          >
            {it.label}
            {active && (
              <motion.span
                layoutId={`tab-${id}`}
                className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
          </Link>
        );
      })}
    </div>
  );
}

/** Encabezado de página con entrada suave. */
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-wrap items-end justify-between gap-4"
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-[28px]">{title}</h1>
        {subtitle && <p className="mt-1 text-[13px] text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </motion.div>
  );
}

/** Contador de tiempo de misión que avanza cada segundo. */
export function MissionClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  const utc = now ? now.toISOString().slice(11, 19) : "--:--:--";
  return <span className="font-mono tabular-nums">{utc} UTC</span>;
}
