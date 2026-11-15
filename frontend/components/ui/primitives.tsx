import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn, STATUS_META } from "@/lib/utils";
import type { Status } from "@/lib/types";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("card p-5", className)} {...props} />;
}

export function CardTitle({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h3 className="text-[15px] font-semibold">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function StatusBadge({ status, label, className }: { status: Status; label?: string; className?: string }) {
  const m = STATUS_META[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap", m.bg, m.text, className)}>
      <span className="relative flex size-1.5">
        {status === "critico" && <span className={cn("absolute inline-flex size-full animate-ping rounded-full opacity-75", m.dot)} />}
        <span className={cn("relative inline-flex size-1.5 rounded-full", m.dot)} />
      </span>
      {label ?? m.label}
    </span>
  );
}

const PILL_TONES = {
  primary: "bg-primary/15 text-primary",
  normal: "bg-normal/15 text-normal",
  atencion: "bg-atencion/15 text-atencion",
  advertencia: "bg-advertencia/15 text-advertencia",
  critico: "bg-critico/15 text-critico",
  muted: "bg-surface-2 text-muted",
} as const;
export type PillTone = keyof typeof PILL_TONES;

export function Pill({ tone = "muted", children, className }: { tone?: PillTone; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold whitespace-nowrap", PILL_TONES[tone], className)}>
      {children}
    </span>
  );
}

export function LiveBadge({ label = "En vivo" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-critico/15 px-2.5 py-1 text-xs font-semibold text-critico">
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-critico opacity-75" />
        <span className="relative inline-flex size-2 rounded-full bg-critico" />
      </span>
      {label}
    </span>
  );
}

export function Avatar({ initials, size = 32, className }: { initials: string; size?: number; className?: string }) {
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full bg-primary/20 font-bold text-primary ring-2 ring-surface", className)}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
    >
      {initials}
    </span>
  );
}

const BTN = {
  primary: "bg-primary text-white hover:bg-[#6a9dff] shadow-[0_8px_24px_-10px_rgb(79_140_255/0.8)]",
  secondary: "bg-surface-2 text-fg border border-border hover:border-primary/50",
  ghost: "text-muted hover:text-fg hover:bg-surface-2",
  danger: "bg-critico text-white hover:bg-[#f25f5f]",
} as const;

export function buttonClass(variant: keyof typeof BTN = "primary", className?: string) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold transition-all duration-200 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50",
    BTN[variant],
    className,
  );
}

export function Button({ variant = "primary", className, ...props }: ComponentProps<"button"> & { variant?: keyof typeof BTN }) {
  return <button className={buttonClass(variant, className)} {...props} />;
}

export function ButtonLink({ variant = "primary", className, ...props }: ComponentProps<typeof Link> & { variant?: keyof typeof BTN }) {
  return <Link className={buttonClass(variant, className)} {...props} />;
}
