import { BookOpen } from "lucide-react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/animated";
import { Stagger, StaggerItem } from "@/components/ui/motion";
import { Card } from "@/components/ui/primitives";
import { DOC_INDEX, DOC_SOURCES, DOC_SAMPLE } from "@/services/docs";

export const metadata: Metadata = { title: "Documentación" };

export default function DocumentationPage() {
  return (
    <>
      <PageHeader title="Documentación" subtitle="Cómo funciona la plataforma, los modelos de IA y las fuentes de datos" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
        <Card className="h-fit p-3 lg:sticky lg:top-24">
          {DOC_INDEX.map((g) => (
            <div key={g.group} className="mb-2">
              <p className="px-2.5 pt-3 pb-1.5 text-[10px] font-semibold tracking-wider text-muted">{g.group}</p>
              {g.items.map((it) => (
                <a
                  key={it}
                  href={it === "Fuentes de datos" ? "#fuentes" : "#"}
                  className={
                    it === "Fuentes de datos"
                      ? "block rounded-lg bg-primary/15 px-2.5 py-2 text-[13px] font-semibold"
                      : "block rounded-lg px-2.5 py-2 text-[13px] font-medium text-muted transition-colors hover:bg-surface-2 hover:text-fg"
                  }
                >
                  {it}
                </a>
              ))}
            </div>
          ))}
        </Card>
        <Card className="p-6 md:p-10">
          <Stagger className="flex max-w-3xl flex-col gap-5">
            <StaggerItem><p className="text-xs font-medium text-muted">Plataforma / Fuentes de datos</p></StaggerItem>
            <StaggerItem><h2 id="fuentes" className="text-[28px] font-bold tracking-tight">Fuentes de datos</h2></StaggerItem>
            <StaggerItem>
              <p className="text-sm leading-relaxed text-muted">
                Cada lectura de salud indica de dónde viene. Así el médico sabe cuánto confiar en el dato y el frontend puede mostrar la fuente junto a cada gráfica.
              </p>
            </StaggerItem>
            <StaggerItem className="flex gap-3 rounded-xl border border-primary/60 bg-primary/10 px-4 py-3.5">
              <BookOpen className="mt-0.5 size-[18px] shrink-0 text-primary" />
              <p className="text-[13px] leading-relaxed">
                En este prototipo todos los datos son ficticios y viven en una capa de servicios centralizada (<code className="font-mono">services/</code>). Al
                conectar FastAPI y Supabase se cambia esa capa, no la interfaz.
              </p>
            </StaggerItem>
            <StaggerItem><h3 className="mt-2 text-lg font-semibold">Tipos de fuente</h3></StaggerItem>
            <StaggerItem className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-left text-[13px]">
                <thead className="bg-surface-2 text-[11px] tracking-wider text-muted">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">FUENTE</th>
                    <th className="px-4 py-2.5 font-semibold">VARIABLES</th>
                    <th className="px-4 py-2.5 font-semibold">FRECUENCIA</th>
                  </tr>
                </thead>
                <tbody>
                  {DOC_SOURCES.map((s) => (
                    <tr key={s.name} className="border-t border-border">
                      <td className="px-4 py-3 font-semibold">{s.name}</td>
                      <td className="px-4 py-3 text-muted">{s.vars}</td>
                      <td className="px-4 py-3 text-muted">{s.freq}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </StaggerItem>
            <StaggerItem><h3 className="mt-2 text-lg font-semibold">Ejemplo de respuesta de la API</h3></StaggerItem>
            <StaggerItem>
              <pre className="overflow-x-auto rounded-xl border border-border bg-bg p-5 font-mono text-xs leading-relaxed">{DOC_SAMPLE}</pre>
            </StaggerItem>
          </Stagger>
        </Card>
      </div>
    </>
  );
}
