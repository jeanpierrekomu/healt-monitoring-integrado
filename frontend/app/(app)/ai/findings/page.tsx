import type { Metadata } from "next";
import { Card, CardTitle, Pill, type PillTone } from "@/components/ui/primitives";
import { backendCrewNames, backendFindings } from "@/services/backend";
import { labelText } from "@/services/backend-text";

export const metadata: Metadata = { title: "Hallazgos reales" };

const MODEL: Record<string, string> = {
  physio_suite_v1_1: "Signos físicos",
  vision_kinematic_gesture_v1_1: "Visión y gestos",
  multimodal_contextual_fusion_v1_1: "Fusión multimodal",
};
const MODALITY: Record<string, string> = { wearable: "Dispositivo", video: "Video", audio: "Audio" };
const REVIEW: Record<string, { label: string; tone: PillTone }> = {
  pending: { label: "Pendiente", tone: "atencion" },
  confirmed: { label: "Confirmado", tone: "normal" },
  rejected: { label: "Descartado", tone: "muted" },
};
const when = (iso: string) =>
  new Date(iso).toLocaleString("es-PE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Lima" });

/** Hallazgos que los modelos de IA del equipo guardaron en el backend. */
export default async function FindingsPage() {
  const [findings, names] = await Promise.all([backendFindings(), backendCrewNames()]);

  if (!findings) {
    return (
      <Card>
        <CardTitle title="Sin conexión con el backend" />
        <p className="text-[13px] text-muted">
          No se pudo leer el backend del equipo. Revisa las variables <code className="font-mono text-fg">NEXT_PUBLIC_SUPABASE_URL</code> y{" "}
          <code className="font-mono text-fg">NEXT_PUBLIC_SUPABASE_KEY</code> en <code className="font-mono text-fg">.env.local</code>.
        </p>
      </Card>
    );
  }

  const byLabel = new Map<string, number>();
  for (const f of findings) byLabel.set(f.label, (byLabel.get(f.label) ?? 0) + 1);
  const avg = findings.length ? findings.reduce((s, f) => s + f.confidence, 0) / findings.length : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Card>
          <p className="text-[13px] font-medium text-muted">Hallazgos guardados</p>
          <p className="mt-2 font-mono text-[30px] leading-none font-bold">{findings.length}</p>
          <p className="mt-2 text-[11px] text-muted">los más recientes</p>
        </Card>
        <Card>
          <p className="text-[13px] font-medium text-muted">Confianza media</p>
          <p className="mt-2 font-mono text-[30px] leading-none font-bold">{findings.length ? `${(avg * 100).toFixed(1)} %` : "—"}</p>
          <p className="mt-2 text-[11px] text-muted">según el propio modelo</p>
        </Card>
        {[...byLabel.entries()].slice(0, 2).map(([label, n]) => (
          <Card key={label}>
            <p className="text-[13px] font-medium text-muted">{labelText(label)}</p>
            <p className="mt-2 font-mono text-[30px] leading-none font-bold">{n}</p>
            <p className="mt-2 text-[11px] text-muted">veces detectado</p>
          </Card>
        ))}
      </div>

      <Card className="p-0">
        <div className="px-5 pt-5">
          <CardTitle
            title="Hallazgos de los modelos"
            subtitle="Datos reales del backend del equipo. Se actualizan cada minuto."
            right={<Pill tone="normal">Datos reales</Pill>}
          />
        </div>
        {findings.length === 0 ? (
          <p className="px-5 pb-5 text-[13px] text-muted">Todavía no hay hallazgos guardados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="text-[11px] tracking-wide text-muted">
                <tr>
                  {["HALLAZGO", "TRIPULANTE", "MODELO", "CONFIANZA", "VENTANA", "FECHA", "EVIDENCIA", "REVISIÓN"].map((h) => (
                    <th key={h} className="px-5 py-3 font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {findings.map((f) => {
                  const r = REVIEW[f.review_status] ?? { label: f.review_status, tone: "muted" as PillTone };
                  return (
                    <tr key={f.id} className="border-t border-border align-top transition-colors hover:bg-surface-2/50">
                      <td className="px-5 py-3.5 font-semibold whitespace-nowrap">{labelText(f.label)}</td>
                      <td className="px-5 py-3.5 whitespace-nowrap">{f.crew_member_id ? (names[f.crew_member_id] ?? f.crew_member_id) : "—"}</td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {f.model_runs ? (MODEL[f.model_runs.model_name] ?? f.model_runs.model_name) : "—"}
                        {f.model_runs && <span className="block text-[11px] text-muted">{MODALITY[f.model_runs.modality] ?? f.model_runs.modality}</span>}
                      </td>
                      <td className="px-5 py-3.5 font-mono font-semibold tabular-nums">{(f.confidence * 100).toFixed(1)} %</td>
                      <td className="px-5 py-3.5 font-mono whitespace-nowrap text-muted tabular-nums">{f.start_s}–{f.end_s} s</td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-muted">{f.model_runs ? when(f.model_runs.started_at) : "—"}</td>
                      <td className="max-w-md px-5 py-3.5 text-muted">{f.evidence?.description || "—"}</td>
                      <td className="px-5 py-3.5"><Pill tone={r.tone}>{r.label}</Pill></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
