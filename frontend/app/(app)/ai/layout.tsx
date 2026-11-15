import { PageHeader, TabsNav } from "@/components/ui/animated";

export default function AiLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Laboratorio de IA" subtitle="Experimenta con los modelos de visión y audio antes de conectarlos a producción" />
      <TabsNav
        id="ai"
        items={[
          { href: "/ai/vision", label: "Visión" },
          { href: "/ai/audio", label: "Audio" },
          { href: "/ai/evaluation", label: "Evaluación" },
          { href: "/ai/findings", label: "Hallazgos reales" },
        ]}
      />
      {children}
    </div>
  );
}
