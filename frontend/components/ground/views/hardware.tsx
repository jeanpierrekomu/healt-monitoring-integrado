"use client";

// Hardware: el prototipo del dispositivo en 3D. Primero se ve cómo está armado (piezas separadas),
// luego las dos placas se juntan en "sándwich" y al final se cierra la carcasa.
// La lista de piezas entra con una animación escalonada hecha con anime.js.
import { animate, stagger } from "animejs";
import { Box, Layers, Pause, Play, RotateCw, Sparkles, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { PageTitle } from "@/components/ground/shell";
import { HardwarePhotos } from "@/components/ground/views/hardware-photos";
import { Panel, SimulatedTag, Tag } from "@/components/ground/ui";
import type { PartId, Readings } from "@/components/three/hardware-proto";
import { rng } from "@/lib/ground/sim";
import { cn } from "@/lib/utils";

const HardwareProto = dynamic(() => import("@/components/three/hardware-proto"), {
  ssr: false,
  loading: () => <div className="skeleton size-full rounded-lg" />,
});

// Fichas de las piezas, por ahora solo en inglés (el contenido no pasa por el traductor).
interface PartInfo {
  id: PartId;
  name: string;
  model: string;
  where: string;
  measures?: string;
  what: string;
  how: string;
  specs: string[];
}

const PARTS: PartInfo[] = [
  {
    id: "max30102", name: "Optical heart-rate sensor", model: "MAX30102", where: "Bottom board · against the skin", measures: "Heart rate (BPM) · SpO₂",
    what: "Measures the astronaut's pulse and blood oxygen level without needles or cuffs.",
    how: "Two LEDs shine red and infrared light into the skin. A photodetector reads how much light comes back: blood absorbs more light with every heartbeat, so the signal pulses with the heart. Comparing red and infrared light gives the oxygen saturation.",
    specs: ["Red (660 nm) and infrared (880 nm) LEDs", "Built-in photodetector and 18-bit converter", "I²C interface"],
  },
  {
    id: "temp", name: "Body temperature sensor", model: "MAX30205", where: "Bottom board · against the skin", measures: "Body temperature",
    what: "Tracks the astronaut's body temperature to spot fever or overheating early.",
    how: "Placed in contact with the skin, it converts temperature into a digital reading. It is designed for clinical-grade body temperature, so it is most precise in the human range.",
    specs: ["±0.1 °C accuracy (37–39 °C)", "16-bit resolution", "I²C interface"],
  },
  {
    id: "mpu", name: "Accelerometer and gyroscope", model: "MPU6050 (MPU6515 compatible)", where: "Bottom board", measures: "Movement · rotation",
    what: "Detects how the astronaut moves: activity, stillness, sudden impacts or falls, and body orientation.",
    how: "A 3-axis accelerometer measures changes in speed and a 3-axis gyroscope measures rotation. Together they describe movement in all directions, which also helps flag readings taken while moving.",
    specs: ["3-axis accelerometer (±2 to ±16 g)", "3-axis gyroscope (±250 to ±2000 °/s)", "I²C interface"],
  },
  {
    id: "esp32", name: "Microcontroller with Wi-Fi and Bluetooth", model: "ESP32-WROOM-32", where: "Top board", 
    what: "The brain of AZRIEL: it reads every sensor, processes the data and sends it to the station.",
    how: "All sensors share the same I²C bus. The ESP32 polls them, computes the values and transmits them over Wi-Fi or Bluetooth; it also drives the screen.",
    specs: ["Dual-core processor up to 240 MHz", "Wi-Fi 802.11 b/g/n and Bluetooth / BLE", "USB-C for power and programming"],
  },
  {
    id: "oled", name: "Display", model: 'OLED SSD1306 0.96" (128 × 64)', where: "Top board",
    what: "Shows the live measurements on the device itself, so the crew can check them without another screen.",
    how: "A small monochrome OLED panel: each pixel lights up on its own, so it is readable and uses little power.",
    specs: ["128 × 64 pixels", "0.96-inch panel", "I²C interface"],
  },
  {
    id: "boards", name: "Stacked perfboards", model: "2 × 7 × 9 cm boards", where: "Joined by standoffs and wires",
    what: "Hold all the components in a compact sandwich.",
    how: "The top board carries the electronics and the screen; the bottom board carries the sensors facing the skin. Brass standoffs keep them apart and wires connect them.",
    specs: ["Top: ESP32 + display", "Bottom: MPU6050, MAX30205, MAX30102", "Wired connection between boards"],
  },
  {
    id: "case", name: "Case", model: "Two halves", where: "Wraps the sandwich",
    what: "Protects the boards and makes the device wearable.",
    how: "The top half leaves a window for the display; the bottom half exposes the sensors so they touch the skin.",
    specs: ["Display window on top", "Sensor area underneath"],
  },
];

// Orden del recorrido: primero el dispositivo terminado y luego se va desarmando.
const STAGES = [
  { value: 2, label: "Con carcasa", icon: Sparkles },
  { value: 1, label: "Sándwich", icon: Box },
  { value: 0, label: "Cómo está armado", icon: Layers },
];

export function HardwareView() {
  const [stage, setStage] = useState(2);
  const [view, setView] = useState<"model" | "photos">("model");
  const [selected, setSelected] = useState<PartId | null>(null);
  const [spin, setSpin] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [readings, setReadings] = useState<Readings>({ hr: 72, spo2: 98, temp: 36.6, move: 0.05 });
  const listRef = useRef<HTMLUListElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Recorrido automático: con carcasa → sándwich → cómo está armado (como el traje del astronauta).
  const play = useCallback(() => {
    timers.current.forEach(clearTimeout);
    setPlaying(true);
    setStage(2);
    timers.current = [setTimeout(() => setStage(1), 2600), setTimeout(() => setStage(0), 5600), setTimeout(() => setPlaying(false), 7200)];
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- el recorrido arranca solo al abrir la pantalla
    play();
    const list = timers.current;
    return () => list.forEach(clearTimeout);
  }, [play]);

  // Lista de piezas: entrada escalonada con anime.js.
  useEffect(() => {
    if (!listRef.current) return;
    const a = animate(listRef.current.querySelectorAll("li"), { opacity: [0, 1], translateX: [-18, 0], delay: stagger(70, { start: 250 }), duration: 520, ease: "outQuart" });
    return () => {
      a.revert();
    };
  }, []);

  // Lecturas simuladas (con semilla) para la pantalla y el sensor que late.
  useEffect(() => {
    const r = rng(7);
    const id = setInterval(() => {
      setReadings((p) => ({
        hr: Math.min(110, Math.max(58, p.hr + (r() - 0.5) * 3 + (72 - p.hr) * 0.08)),
        spo2: Math.min(100, Math.max(94, p.spo2 + (r() - 0.5) * 0.4 + (98 - p.spo2) * 0.1)),
        temp: Math.min(37.6, Math.max(36.1, p.temp + (r() - 0.5) * 0.03 + (36.6 - p.temp) * 0.05)),
        move: Math.max(0, Math.min(1.5, p.move * 0.8 + (r() < 0.12 ? r() * 0.8 : r() * 0.04))),
      }));
    }, 700);
    return () => clearInterval(id);
  }, []);

  const info = PARTS.find((p) => p.id === selected);
  const choose = (v: number) => {
    timers.current.forEach(clearTimeout);
    setPlaying(false);
    setStage(v);
  };
  // Al elegir una pieza interna, el modelo se desarma para que se vea.
  const pick = useCallback((id: PartId | null) => {
    setSelected(id);
    if (id && id !== "case") {
      timers.current.forEach(clearTimeout);
      setPlaying(false);
      setStage(0);
    }
  }, []);

  return (
    <>
      <PageTitle
        title="Hardware · AZRIEL"
        subtitle="Prototipo del dispositivo AZRIEL: dos placas en sándwich con 5 componentes principales que miden ritmo cardíaco, oxigenación, temperatura y movimiento."
        right={
          <div className="flex rounded-md border border-border p-0.5 text-[13px]" role="tablist">
            {([["model", "Modelo 3D"], ["photos", "Fotos reales"]] as const).map(([k, label]) => (
              <button key={k} type="button" role="tab" aria-selected={view === k} onClick={() => setView(k)} className={cn("h-8 rounded px-3 font-semibold", view === k ? "bg-cyan-400/15 text-cyan-300" : "text-muted hover:text-fg")}>
                {label}
              </button>
            ))}
          </div>
        }
      />
      {view === "photos" ? (
        <HardwarePhotos />
      ) : (
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="relative overflow-hidden rounded-lg border border-border bg-[radial-gradient(ellipse_at_center,#0f1a2e_0%,#060a12_75%)]">
          <div className="h-[560px] md:h-[640px]">
            <HardwareProto stage={stage} selected={selected} onSelect={pick} readings={readings} spin={spin} />
          </div>
          <div className="absolute inset-x-0 top-0 flex flex-wrap items-center gap-2 p-3">
            {STAGES.map(({ value, label, icon: Icon }, i) => (
              <button
                key={value}
                type="button"
                onClick={() => choose(value)}
                className={cn(
                  "flex h-9 items-center gap-2 rounded-md border px-3 text-[13px] font-semibold backdrop-blur transition-colors",
                  stage === value ? "border-cyan-400/60 bg-cyan-400/15 text-cyan-300" : "border-border bg-black/40 text-muted hover:text-fg",
                )}
              >
                <span className="font-mono text-[11px]">{i + 1}</span> <Icon className="size-4" /> {label}
              </button>
            ))}
            <span className="ml-auto flex gap-2">
              <button type="button" onClick={play} disabled={playing} className="flex h-9 items-center gap-1.5 rounded-md bg-cyan-400 px-3 text-[13px] font-bold text-black hover:bg-cyan-300 disabled:opacity-60">
                {playing ? <Pause className="size-4" /> : <Play className="size-4" />} {playing ? "Armando…" : "Ver el armado"}
              </button>
              <button type="button" onClick={() => setSpin(!spin)} aria-pressed={spin} className={cn("flex h-9 items-center gap-1.5 rounded-md border px-3 text-[13px] font-semibold backdrop-blur", spin ? "border-cyan-400/60 text-cyan-300" : "border-border bg-black/40 text-muted")}>
                <RotateCw className="size-4" /> Girar
              </button>
            </span>
          </div>
          <AnimatePresence>
            {info && (
              <motion.div
                key={info.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.25 }}
                className="absolute top-14 left-3 w-[min(400px,calc(100%-24px))] rounded-lg border border-cyan-400/40 bg-[#060a12]/90 p-4 shadow-2xl backdrop-blur"
                data-no-i18n
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-[10px] tracking-[0.2em] text-cyan-300 uppercase">{info.model}</p>
                    <h3 className="mt-0.5 text-[15px] leading-tight font-bold">{info.name}</h3>
                    <p className="mt-0.5 text-[11px] text-muted">{info.where}</p>
                  </div>
                  <button type="button" onClick={() => setSelected(null)} className="text-muted hover:text-fg" aria-label="Close">
                    <X className="size-4" />
                  </button>
                </div>
                {info.measures && <p className="mt-2"><Tag tone="cyan">Measures: {info.measures}</Tag></p>}
                <p className="mt-2 text-[13px] leading-relaxed">{info.what}</p>
                <p className="mt-2 text-[11px] font-semibold tracking-wider text-muted uppercase">How it works</p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-muted">{info.how}</p>
                <ul className="mt-2 flex flex-wrap gap-1">
                  {info.specs.map((x) => (
                    <li key={x} className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted">{x}</li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
          <p className="pointer-events-none absolute right-3 bottom-3 text-[11px] text-muted">Arrastra para girar · rueda para acercar · toca una pieza</p>
        </section>

        <div className="flex flex-col gap-4">
          <Panel title="Piezas" subtitle="Toca una pieza en el modelo o en la lista">
            {(
              <ul ref={listRef} className="flex flex-col gap-1.5">
                {PARTS.map((p) => (
                  <li key={p.id} style={{ opacity: 0 }}>
                    <button type="button" onClick={() => pick(p.id)} className={cn("flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-[13px] hover:border-cyan-400/50", selected === p.id ? "border-cyan-400/60 bg-cyan-400/10" : "border-border")} data-no-i18n>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{p.name}</span>
                        <span className="block truncate font-mono text-[11px] text-muted" data-no-i18n>{p.model}</span>
                      </span>
                      {p.measures && <Tag tone="cyan">{p.measures}</Tag>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="Lecturas del dispositivo" right={<SimulatedTag />}>
            <dl className="grid grid-cols-2 gap-3">
              {[
                { label: "Ritmo cardíaco", value: `${Math.round(readings.hr)} lpm`, color: "text-red-400" },
                { label: "SpO₂", value: `${readings.spo2.toFixed(1)} %`, color: "text-cyan-300" },
                { label: "Temperatura", value: `${readings.temp.toFixed(1)} °C`, color: "text-amber-300" },
                { label: "Movimiento", value: `${readings.move.toFixed(2)} g`, color: "text-emerald-300" },
              ].map((r) => (
                <div key={r.label} className="rounded-md border border-border px-3 py-2">
                  <dt className="text-[11px] font-semibold tracking-wider text-muted uppercase">{r.label}</dt>
                  <dd className={cn("mt-0.5 font-mono text-xl font-bold tabular-nums", r.color)}>{r.value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-xs text-muted">Valores generados para la demostración; son los mismos que muestra la pantalla del modelo.</p>
          </Panel>
          <Panel title="Sobre el modelo">
            <p className="text-[13px] leading-relaxed text-muted">
              Reproduce el prototipo AZRIEL de la foto con las medidas reales de cada módulo: ESP32-WROOM-32, MPU6050, MAX30205,
              MAX30102 y OLED SSD1306. No es el diseño CAD original: las piezas son representaciones fieles en tamaño y posición.
            </p>
          </Panel>
        </div>
      </div>
      )}
    </>
  );
}
