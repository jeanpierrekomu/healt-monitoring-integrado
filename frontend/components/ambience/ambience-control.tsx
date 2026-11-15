"use client";

// Control del sonido ambiente de la estación (barra superior): encender/apagar y volumen.
// El ambiente reacciona a las alertas: se tensa con una grave y se agacha con una máxima.
import { AudioWaveform } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { useAlertPopup } from "@/components/alerts/alert-popup-context";
import { cn } from "@/lib/utils";
import { setAmbienceVolume, setMood, startAmbience, stopAmbience, uiClick } from "@/services/ambience";

const ON_KEY = "hm-ambiente";
const VOL_KEY = "hm-ambiente-vol";

export function AmbienceControl() {
  const { items } = useAlertPopup();
  const [on, setOn] = useState(true);
  const [vol, setVol] = useState(0.5);

  // Preferencias guardadas en este navegador.
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- preferencia guardada en el navegador
      setOn(window.localStorage.getItem(ON_KEY) !== "0");
      const v = Number(window.localStorage.getItem(VOL_KEY));
      if (v > 0 && v <= 1) setVol(v);
    } catch {
      // sin almacenamiento
    }
  }, []);

  // Los navegadores no dejan sonar nada hasta el primer clic o tecla: el ambiente arranca ahí.
  useEffect(() => {
    if (!on) {
      stopAmbience();
      return;
    }
    const active = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive;
    if (active) {
      startAmbience();
      return;
    }
    const go = () => startAmbience();
    window.addEventListener("pointerdown", go, { once: true, capture: true });
    window.addEventListener("keydown", go, { once: true, capture: true });
    return () => {
      window.removeEventListener("pointerdown", go, true);
      window.removeEventListener("keydown", go, true);
    };
  }, [on]);

  useEffect(() => setAmbienceVolume(vol), [vol]);

  // Reacción a las alertas.
  const severity = items[0]?.severity;
  useEffect(() => {
    setMood(severity === "critico" ? "alarm" : severity === "advertencia" ? "tense" : "calm");
  }, [severity, on]);

  // Sonido de interfaz al pulsar botones y enlaces.
  useEffect(() => {
    if (!on) return;
    const onDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement | null)?.closest?.("button, a, select, [role=button]")) uiClick();
    };
    window.addEventListener("pointerdown", onDown, true);
    return () => window.removeEventListener("pointerdown", onDown, true);
  }, [on]);

  const save = (k: string, v: string) => {
    try {
      window.localStorage.setItem(k, v);
    } catch {
      // sin almacenamiento
    }
  };

  return (
    <div
      className={cn(
        "flex h-10 items-center gap-2 rounded-xl border px-3 transition-colors",
        on ? "border-primary/50 bg-primary/10" : "border-border bg-surface",
      )}
    >
      <motion.button
        type="button"
        whileTap={{ scale: 0.92 }}
        onClick={() => {
          setOn(!on);
          save(ON_KEY, on ? "0" : "1");
        }}
        aria-pressed={on}
        title={on ? "Apagar el sonido ambiente de la estación" : "Encender el sonido ambiente de la estación"}
        className={cn("flex items-center gap-1.5 text-xs font-semibold", on ? "text-primary" : "text-muted hover:text-fg")}
      >
        <AudioWaveform className="size-4" />
        <span className="hidden lg:inline">Ambiente</span>
      </motion.button>
      {on && (
        <input
          type="range"
          min={0.05}
          max={1}
          step={0.05}
          value={vol}
          onChange={(e) => {
            const v = Number(e.target.value);
            setVol(v);
            save(VOL_KEY, String(v));
          }}
          aria-label="Volumen del sonido ambiente"
          className="hidden h-1 w-16 cursor-pointer accent-[#4f8cff] md:block"
        />
      )}
    </div>
  );
}
