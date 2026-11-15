"use client";

import { Plus } from "lucide-react";
import { HAS_BACKEND } from "@/services/supabase";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { AstronautCard } from "@/components/astronauts/astronaut-card";
import { PageHeader, Segmented } from "@/components/ui/animated";
import { Button } from "@/components/ui/primitives";
import type { Astronaut, Status } from "@/lib/types";
import { STATUS_META } from "@/lib/utils";

type Filter = "todos" | Status;

export function AstronautsView({ astronauts }: { astronauts: Astronaut[] }) {
  const [filter, setFilter] = useState<Filter>("todos");
  const count = (s: Status) => astronauts.filter((a) => a.status === s).length;
  const options: { value: Filter; label: string }[] = [
    { value: "todos", label: `Todos (${astronauts.length})` },
    ...(["normal", "atencion", "advertencia", "critico"] as Status[]).map((s) => ({
      value: s as Filter,
      label: `${STATUS_META[s].label} (${count(s)})`,
    })),
  ];
  const shown = filter === "todos" ? astronauts : astronauts.filter((a) => a.status === filter);

  return (
    <>
      <PageHeader
        title="Astronautas"
        subtitle={`${astronauts.length} tripulantes · Misión Artemis-H · procedencia y estado actual`}
        actions={
          <Button>
            <Plus className="size-4" /> Añadir astronauta
          </Button>
        }
      />
      <Segmented id="astro-filter" options={options} value={filter} onChange={setFilter} />
      <motion.div layout className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {shown.map((a, i) => (
            <motion.div
              key={a.id}
              layout
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0, transition: { delay: i * 0.04, type: "spring", stiffness: 300, damping: 28 } }}
              exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.18 } }}
            >
              <AstronautCard astronaut={a} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
      <p className="rounded-xl border border-dashed border-border px-4 py-3 text-xs text-muted">
        {HAS_BACKEND
          ? "Tripulación y alertas leídas del backend del equipo. La ficha médica (edad, valores habituales) es de ejemplo hasta que el backend la guarde."
          : "Datos de ejemplo. Al configurar el backend se reemplazan sin tocar la interfaz."}
      </p>
    </>
  );
}
