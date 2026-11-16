"use client";

// Piezas de interfaz del visor en Tierra: estilo de centro de control, sobrio y compacto.
// Incluye los estados de carga, error y "sin datos", y las etiquetas de procedencia del dato.
import { AlertTriangle, ChevronLeft, ChevronRight, Database, RefreshCw, Search, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Level, Provenance } from "@/lib/ground/labels";

export function Panel({ title, subtitle, right, children, className }: { title?: ReactNode; subtitle?: ReactNode; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-lg border border-border bg-surface/80", className)}>
      {(title || right) && (
        <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            {title && <h2 className="text-[13px] font-semibold tracking-wide uppercase">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
          </div>
          {right}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

const TONE = {
  cyan: "border-cyan-400/40 bg-cyan-400/10 text-cyan-300",
  green: "border-normal/40 bg-normal/10 text-normal",
  yellow: "border-atencion/40 bg-atencion/10 text-atencion",
  orange: "border-advertencia/40 bg-advertencia/10 text-advertencia",
  red: "border-critico/40 bg-critico/10 text-critico",
  violet: "border-violet-400/40 bg-violet-400/10 text-violet-300",
  amber: "border-amber-400/40 bg-amber-400/10 text-amber-300",
  gray: "border-border bg-surface-2 text-muted",
} as const;
export type Tone = keyof typeof TONE;

export function Tag({ tone = "gray", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider whitespace-nowrap uppercase", TONE[tone], className)}>{children}</span>;
}

const PROV: Record<Provenance, { label: string; tone: Tone; title: string }> = {
  real: { label: "Real", tone: "cyan", title: "Medición obtenida de un dispositivo físico" },
  reconstructed: { label: "Reconstruido", tone: "amber", title: "Dato estimado para reproducir un evento histórico; no es una medición original" },
  synthetic: { label: "Sintético", tone: "violet", title: "Dato generado artificialmente para una simulación" },
  unknown: { label: "Sin procedencia", tone: "gray", title: "La base no indica de dónde viene este dato" },
};
export function ProvenanceTag({ value }: { value: Provenance }) {
  const p = PROV[value];
  return (
    <span title={p.title}>
      <Tag tone={p.tone}>{p.label}</Tag>
    </span>
  );
}
export function SimulatedTag() {
  return (
    <span title="Datos generados en este navegador para la demostración; no son mediciones">
      <Tag tone="violet">Simulado</Tag>
    </span>
  );
}

const LEVEL: Record<Level, { label: string; tone: Tone }> = {
  normal: { label: "Normal", tone: "green" },
  atencion: { label: "Atención", tone: "yellow" },
  advertencia: { label: "Advertencia", tone: "orange" },
  critico: { label: "Crítica", tone: "red" },
};
export function LevelTag({ level, raw }: { level: Level; raw?: string | null }) {
  return (
    <span title={raw ?? undefined}>
      <Tag tone={LEVEL[level].tone}>{LEVEL[level].label}</Tag>
    </span>
  );
}

export function Stat({ label, value, hint, tone, icon: Icon }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "cyan" | "green" | "yellow" | "red"; icon?: LucideIcon }) {
  const color = tone === "red" ? "text-critico" : tone === "yellow" ? "text-atencion" : tone === "green" ? "text-normal" : tone === "cyan" ? "text-cyan-300" : "text-fg";
  return (
    <div className="rounded-lg border border-border bg-surface/80 px-4 py-3">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-muted uppercase">
        {Icon && <Icon className="size-3.5" />} {label}
      </p>
      <p className={cn("mt-1.5 font-mono text-2xl leading-none font-bold tabular-nums", color)}>{value}</p>
      {hint && <p className="mt-1.5 text-[11px] text-muted">{hint}</p>}
    </div>
  );
}

export function Loading({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2", className)} aria-busy="true" aria-label="Cargando">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton h-9 rounded" />
      ))}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-lg border border-critico/40 bg-critico/10 px-4 py-3 text-[13px]">
      <p className="flex items-center gap-2 font-semibold text-critico">
        <AlertTriangle className="size-4" /> No se pudo leer la base de datos
      </p>
      <p className="font-mono text-xs text-muted" data-no-i18n>{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="flex items-center gap-1.5 text-xs font-semibold text-fg hover:underline">
          <RefreshCw className="size-3.5" /> Reintentar
        </button>
      )}
    </div>
  );
}

export function Empty({ title = "Sin información", hint, icon: Icon = Database }: { title?: string; hint?: ReactNode; icon?: LucideIcon }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border px-4 py-8 text-center">
      <Icon className="size-5 text-muted" />
      <p className="text-[13px] font-semibold">{title}</p>
      {hint && <p className="max-w-md text-xs text-muted">{hint}</p>}
    </div>
  );
}

/** Muestra carga, error o vacío según corresponda; si hay datos, llama a `children`. */
export function DataView<T>({ state, empty, emptyHint, rows, children }: {
  state: { data: T | undefined; error: string | null; loading: boolean; reload: () => void };
  empty?: (d: T) => boolean;
  emptyHint?: ReactNode;
  rows?: number;
  children: (d: T) => ReactNode;
}) {
  if (state.loading && state.data === undefined) return <Loading rows={rows} />;
  if (state.error) return <ErrorState message={state.error} onRetry={state.reload} />;
  if (state.data === undefined) return null;
  if (empty?.(state.data)) return <Empty hint={emptyHint} />;
  return <>{children(state.data)}</>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold tracking-wider text-muted uppercase">{label}</dt>
      <dd className="mt-0.5 text-[13px] break-words">{children ?? "—"}</dd>
    </div>
  );
}

// ─── Filtros reutilizables ───
export function SearchInput({ value, onChange, placeholder = "Buscar…" }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="flex h-9 min-w-[200px] flex-1 items-center gap-2 rounded-md border border-border bg-surface px-2.5 text-[13px] focus-within:border-cyan-400/60">
      <Search className="size-4 text-muted" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="min-w-0 flex-1 bg-transparent outline-none" />
    </label>
  );
}

export function SelectFilter<V extends string>({ label, value, onChange, options }: { label: string; value: V; onChange: (v: V) => void; options: { value: V; label: string }[] }) {
  return (
    <label className="flex h-9 items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-[13px] focus-within:border-cyan-400/60">
      <span className="text-muted">{label}:</span>
      <select value={value} onChange={(e) => onChange(e.target.value as V)} className="cursor-pointer bg-transparent font-semibold outline-none">
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-surface">{o.label}</option>
        ))}
      </select>
    </label>
  );
}

export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>;
}

export function usePageSlice<T>(list: T[], page: number, size: number) {
  const pages = Math.max(1, Math.ceil(list.length / size));
  const p = Math.min(page, pages - 1);
  return { slice: list.slice(p * size, p * size + size), pages, page: p };
}

export function Pagination({ page, pages, total, onPage }: { page: number; pages: number; total: number; onPage: (p: number) => void }) {
  if (pages <= 1) return <p className="mt-3 text-xs text-muted">{total} registros</p>;
  return (
    <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted">
      <span>{total} registros</span>
      <span className="flex items-center gap-2">
        <button type="button" disabled={page === 0} onClick={() => onPage(page - 1)} className="rounded border border-border p-1 hover:text-fg disabled:opacity-40" aria-label="Página anterior">
          <ChevronLeft className="size-4" />
        </button>
        <span className="font-mono">{page + 1} / {pages}</span>
        <button type="button" disabled={page >= pages - 1} onClick={() => onPage(page + 1)} className="rounded border border-border p-1 hover:text-fg disabled:opacity-40" aria-label="Página siguiente">
          <ChevronRight className="size-4" />
        </button>
      </span>
    </div>
  );
}

/** Foto de Supabase Storage con iniciales si no hay imagen. */
export function Photo({ src, name, size = 48, rounded = "rounded-md" }: { src: string | null; name: string | null; size?: number; rounded?: string }) {
  const initials = (name ?? "?").split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element -- imágenes externas de Supabase Storage
    <img src={src} alt={name ?? ""} width={size} height={size} className={cn("shrink-0 bg-surface-2 object-cover", rounded)} style={{ width: size, height: size }} loading="lazy" />
  ) : (
    <span className={cn("flex shrink-0 items-center justify-center bg-surface-2 font-mono text-xs font-bold text-muted", rounded)} style={{ width: size, height: size }} data-no-i18n>
      {initials}
    </span>
  );
}
