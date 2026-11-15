"use client";

import type { LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { AnimatedNumber } from "./animated";
import { useLiveValue } from "@/hooks/use-live-series";
import { cn } from "@/lib/utils";
import type { VitalKey } from "@/lib/types";
import { InfoButton } from "@/components/didactic/vital-info";

export function StatCard({
  icon: Icon,
  title,
  value,
  decimals = 0,
  suffix = "",
  detail,
  href,
  live,
  tone = "text-primary",
  info,
}: {
  info?: VitalKey;
  icon: LucideIcon;
  title: string;
  value: number;
  decimals?: number;
  suffix?: string;
  detail?: string;
  href?: string;
  live?: { amp: number; interval?: number };
  tone?: string;
}) {
  const liveValue = useLiveValue(value, live?.amp ?? 0, live?.interval ?? 2500);
  const shown = live ? liveValue : value;
  const body = (
    <>
      <div className="flex items-center gap-2 text-[13px] font-medium text-muted">
        <span className={cn("flex size-7 items-center justify-center rounded-lg bg-surface-2", tone)}>
          <Icon className="size-4" />
        </span>
        {title}
        <span className="ml-auto flex items-center gap-2">
          {info && <InfoButton vital={info} value={shown} align="right" />}
          {live && <span className="size-1.5 rounded-full bg-normal shadow-[0_0_8px_#22C55E]" />}
        </span>
      </div>
      <div className="mt-3 text-2xl leading-none font-bold tracking-tight md:text-[30px]">
        <AnimatedNumber value={shown} decimals={decimals} suffix={suffix} />
      </div>
      {detail && <p className="mt-2 text-xs text-muted">{detail}</p>}
    </>
  );
  return (
    <motion.div whileHover={{ y: -3 }} transition={{ type: "spring", stiffness: 380, damping: 26 }} className="h-full">
      {href ? (
        <Link href={href} className="card glow-hover block h-full p-5">
          {body}
        </Link>
      ) : (
        <div className="card glow-hover h-full p-5">{body}</div>
      )}
    </motion.div>
  );
}
