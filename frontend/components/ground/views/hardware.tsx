"use client";

// Hardware: el prototipo del dispositivo en 3D. Primero se ve cómo está armado (piezas separadas),
// luego las dos placas se juntan en "sándwich" y al final se cierra la carcasa.
// La lista de piezas entra con una animación escalonada hecha con anime.js.
import { animate, stagger } from "animejs";
import { Box, Layers, Pause, Play, RotateCw, Sparkles } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { PageTitle } from "@/components/ground/shell";
import { Panel, SimulatedTag, Tag } from "@/components/ground/ui";
import type { PartId, Readings } from "@/components/three/hardware-proto";
import { rng } from "@/lib/ground/sim";
import { cn } from "@/lib/utils";

const HardwareProto = dynamic(() => import("@/components/three/hardware-proto"), {
  ssr: false,
  loading: () => <div className="skeleton size-full rounded-lg" />,
});

interface PartInfo {
  id: PartId;
  name: string;
  model: string;
  where: string;
  measures?: string;
  text: string;
}

const PARTS: PartInfo[] = [
  { id: "max30102", name: "Sensor óptico de frecuencia cardíaca", model: "MAX30102", where: "Placa inferior · contra la piel", measures: "Ritmo cardíaco (BPM) · SpO₂", text: "Emite luz roja e infrarroja que atraviesa la piel; según cuánta luz vuelve, calcula las pulsaciones por minuto y el oxígeno en la sangre." },
  { id: "temp", name: "Sensor de temperatura", model: "MAX30205", where: "Placa inferior · contra la piel", measures: "Temperatura corporal", text: "Mide la temperatura en contacto con la piel con precisión de décimas de grado." },
  { id: "mpu", name: "Acelerómetro y giroscopio", model: "MPU6050 (compatible MPU6515)", where: "Placa inferior", measures: "Movimiento y rotación", text: "Detecta aceleración y giro en tres ejes: sirve para saber si el astronauta se mueve, está quieto o tuvo un golpe." },
  { id: "esp32", name: "Microcontrolador con Wi-Fi y Bluetooth", model: "ESP32-WROOM-32", where: "Placa superior", text: "Lee los sensores por I²C y envía los datos por Wi-Fi o Bluetooth a la estación." },
  { id: "oled", name: "Pantalla", model: 'OLED SSD1306 0,96" (128 × 64)', where: "Placa superior", text: "Muestra las mediciones al momento, sin necesidad de otro equipo." },
  { id: "boards", name: "Placas perforadas en sándwich", model: "2 × placa de 7 × 9 cm", where: "Unidas con separadores y cables", text: "Arriba va la electrónica y la pantalla; abajo, los sensores mirando hacia la piel." },
  { id: "case", name: "Carcasa", model: "Dos mitades", where: "Envuelve el sándwich", text: "Protege las placas; deja visible la pantalla arriba y los sensores en contacto con la piel abajo." },
];

const STAGES = [
  { value: 0, label: "Cómo está armado", icon: Layers },
  { value: 1, label: "Sándwich", icon: Box },
  { value: 2, label: "Con carcasa", icon: Sparkles },
];

export function HardwareView() {
  const [stage, setStage] = useState(0);
  const [selected, setSelected] = useState<PartId | null>(null);
  const [spin, setSpin] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [readings, setReadings] = useState<Readings>({ hr: 72, spo2: 98, temp: 36.6, move: 0.05 });
  const listRef = useRef<HTMLUListElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Recorrido automático: piezas separadas → sándwich → carcasa (como el traje del astronauta).
  const play = useCallback(() => {
    timers.current.forEach(clearTimeout);
    setPlaying(true);
    setStage(0);
    timers.current = [setTimeout(() => setStage(1), 2600), setTimeout(() => setStage(2), 5600), setTimeout(() => setPlaying(false), 7200)];
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

  return (
    <>
      <PageTitle
        title="Hardware · AZRIEL"
        subtitle="Prototipo del dispositivo AZRIEL: dos placas en sándwich con 5 componentes principales que miden ritmo cardíaco, oxigenación, temperatura y movimiento."
        right={<Tag tone="gray">Modelo armado con las medidas de los módulos</Tag>}
      />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="relative overflow-hidden rounded-lg border border-border bg-[radial-gradient(ellipse_at_center,#0f1a2e_0%,#060a12_75%)]">
          <div className="h-[560px] md:h-[640px]">
            <HardwareProto stage={stage} selected={selected} onSelect={setSelected} readings={readings} spin={spin} />
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
          <p className="pointer-events-none absolute right-3 bottom-3 text-[11px] text-muted">Arrastra para girar · rueda para acercar · toca una pieza</p>
        </section>

        <div className="flex flex-col gap-4">
          <Panel title={info ? info.name : "Piezas"} subtitle={info ? `${info.model} · ${info.where}` : "Toca una pieza en el modelo o en la lista"}>
            {info ? (
              <div className="text-[13px]">
                {info.measures && <p className="mb-2"><Tag tone="cyan">{info.measures}</Tag></p>}
                <p className="leading-relaxed text-muted">{info.text}</p>
                <button type="button" onClick={() => setSelected(null)} className="mt-3 text-xs font-semibold text-cyan-300 hover:underline">Ver todas las piezas</button>
              </div>
            ) : (
              <ul ref={listRef} className="flex flex-col gap-1.5">
                {PARTS.map((p) => (
                  <li key={p.id} style={{ opacity: 0 }}>
                    <button type="button" onClick={() => setSelected(p.id)} onMouseEnter={() => setSelected(null)} className="flex w-full items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-left text-[13px] hover:border-cyan-400/50">
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
    </>
  );
}
